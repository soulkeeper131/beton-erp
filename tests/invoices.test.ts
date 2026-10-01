import { describe, it, expect, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clients, sites, pourings, pouringItems, invoices, invoiceItems } from "@/db/schema";
import { actInvoiceLines, checkInvoiceRules, invoiceSchema, invoiceZodError, nextProformaNumber } from "@/lib/invoices";
import { deleteDraftInvoice, issueInvoice, previewNumber, saveInvoice } from "@/lib/invoices-db";
import { billedMessage, invoicedBy, itemsChanged } from "@/lib/acts-db";

const input = (over: Record<string, any> = {}) => invoiceSchema.parse({
  clientId: 1, date: "2099-01-10", dueDate: "2099-01-24", taxEventDate: "2099-01-10",
  items: [{ description: "Бетон C20/25", unit: "m³", quantity: 10, price: 150, vatRate: 20 }],
  ...over,
});

describe("фактури — чисти правила", () => {
  it("проформите имат отделна поредица", () => {
    expect(nextProformaNumber([])).toBe("PF-000001");
    expect(nextProformaNumber(["PF-000009", "Inv-1000000050"])).toBe("PF-000010");
  });

  it("грешките са на български и с ред", () => {
    const r = invoiceSchema.safeParse({ clientId: 1, date: "2099-01-10", dueDate: "", taxEventDate: "2099-01-10", items: [] });
    expect(r.success).toBe(false);
    expect(invoiceZodError((r as any).error)).toMatch(/Падеж/);
    const r2 = invoiceSchema.safeParse({ ...input(), items: [{ description: "x", quantity: 0, price: 1 }] });
    expect(invoiceZodError((r2 as any).error)).toBe("Ред 1: Количеството трябва да е > 0");
    const r3 = invoiceSchema.safeParse({ ...input(), items: [{ description: "x", quantity: 1, price: 1, vatRate: 18 }] });
    expect(invoiceZodError((r3 as any).error)).toMatch(/0, 9 или 20/);
  });

  it("празни полета от формата не чупят фактурата", () => {
    const r = invoiceSchema.safeParse({ ...input(), supplierId: "", relatedInvoiceId: "", pouringIds: [] });
    expect(r.success).toBe(true);
    expect((r as any).data.supplierId).toBeNull();
  });

  it("бизнес правила", () => {
    expect(checkInvoiceRules(input({ items: [{ description: "x", quantity: 1, price: 1, vatRate: 0 }] }))).toMatch(/Основание/);
    expect(checkInvoiceRules(input({ dueDate: "2099-01-01" }))).toMatch(/Падежът/);
    expect(checkInvoiceRules(input({ type: "proforma", pouringIds: [1] }))).toMatch(/Актове/);
    expect(checkInvoiceRules(input())).toBeNull();
  });

  it("редове от актове — по дата, с номер и обект", () => {
    const lines = actInvoiceLines([
      { id: 7, date: "2026-10-02", siteName: "Бояна", items: [{ concreteTypeName: "C25/30", quantityM3: 8, pricePerM3: 160 }] },
      { id: 5, date: "2026-10-01", siteName: "Бояна", items: [{ concreteTypeName: "C20/25", quantityM3: 10, pricePerM3: 150 }, { concreteTypeName: "C8/10", quantityM3: 0, pricePerM3: 1 }] },
    ]);
    expect(lines).toEqual([
      { description: "Бетон C20/25 — акт №5 от 01.10.2026, Бояна", unit: "m³", quantity: 10, price: 150, vatRate: 20 },
      { description: "Бетон C25/30 — акт №7 от 02.10.2026, Бояна", unit: "m³", quantity: 8, price: 160, vatRate: 20 },
    ]);
  });
});

describe("фактури — номерация и актове (база)", () => {
  const client = db.insert(clients).values({ name: "Тест фактури " + Date.now() }).returning().get();
  const other = db.insert(clients).values({ name: "Друг клиент " + Date.now() }).returning().get();
  const site = db.insert(sites).values({ clientId: client.id, name: "Тест обект", address: "ул. 1" }).returning().get();
  const mkAct = (date: string, qty: number) => {
    const a = db.insert(pourings).values({ siteId: site.id, date, quantityM3: qty }).returning().get();
    db.insert(pouringItems).values({ pouringId: a.id, concreteTypeId: 1, quantityM3: qty, pricePerM3: 150, total: qty * 150, sortOrder: 0 }).run();
    return a.id;
  };
  const created: number[] = [];
  const save = (over: Record<string, any> = {}, existing: number | null = null) => {
    const r = saveInvoice(input({ clientId: client.id, ...over }), existing);
    if ("id" in r && !created.includes(r.id)) created.push(r.id);
    return r;
  };

  afterAll(() => {
    db.update(pourings).set({ invoiceId: null }).where(eq(pourings.siteId, site.id)).run();
    if (created.length) {
      db.delete(invoiceItems).where(inArray(invoiceItems.invoiceId, created)).run();
      db.update(invoices).set({ relatedInvoiceId: null }).where(inArray(invoices.id, created)).run();
      db.delete(invoices).where(inArray(invoices.id, created)).run();
    }
    const acts = db.select({ id: pourings.id }).from(pourings).where(eq(pourings.siteId, site.id)).all().map((a) => a.id);
    if (acts.length) db.delete(pouringItems).where(inArray(pouringItems.pouringId, acts)).run();
    db.delete(pourings).where(eq(pourings.siteId, site.id)).run();
    db.delete(sites).where(eq(sites.id, site.id)).run();
    db.delete(clients).where(inArray(clients.id, [client.id, other.id])).run();
  });

  it("черновата няма номер; номерът се дава при издаване, поред", () => {
    const a = save() as { id: number };
    const b = save() as { id: number };
    const numA = db.select().from(invoices).where(eq(invoices.id, a.id)).get()!.number;
    expect(numA).toBe(`Чернова-${a.id}`);

    const expected = previewNumber("outgoing");
    const ib = issueInvoice(b.id) as { number: string };
    expect(ib.number).toBe(expected);
    const ia = issueInvoice(a.id) as { number: string };
    expect(parseInt(ia.number.slice(4))).toBe(parseInt(ib.number.slice(4)) + 1);
    expect(issueInvoice(a.id)).toMatchObject({ status: 409 });
    expect(deleteDraftInvoice(a.id)).toMatchObject({ status: 409 });
  });

  it("стара чернова с „истински“ номер не води до дублиран номер", () => {
    const next = previewNumber("outgoing");
    const legacy = db.insert(invoices).values({
      clientId: client.id, number: next, date: "2099-01-10", dueDate: "2099-01-20", taxEventDate: "2099-01-10", status: "draft",
    }).returning().get();
    created.push(legacy.id);
    const x = save() as { id: number };
    expect((issueInvoice(x.id) as any).number).toBe(next);
    expect(db.select().from(invoices).where(eq(invoices.id, legacy.id)).get()!.number).toBe(`Чернова-${legacy.id}`);
  });

  it("дата преди последната издадена → отказ", () => {
    const c = save({ date: "2099-01-05", dueDate: "2099-01-20", taxEventDate: "2099-01-05" }) as { id: number };
    expect(issueInvoice(c.id)).toMatchObject({ status: 409, error: expect.stringContaining("05.01.2099") });
    // след смяна на датата се издава
    expect(save({ date: "2099-01-12", dueDate: "2099-01-20", taxEventDate: "2099-01-12" }, c.id)).toMatchObject({ id: c.id });
    expect(issueInvoice(c.id)).toHaveProperty("number");
  });

  it("проформата не взема номер от поредицата на фактурите", () => {
    const before = previewNumber("outgoing");
    const p = save({ type: "proforma" }) as { id: number };
    expect((issueInvoice(p.id) as any).number).toMatch(/^PF-\d{6}$/);
    expect(previewNumber("outgoing")).toBe(before);
  });

  it("известие само към издадена фактура на същия клиент", () => {
    const draft = save() as { id: number };
    expect(save({ type: "credit_note", relatedInvoiceId: draft.id })).toMatchObject({ error: expect.stringContaining("издадена") });
    const issued = db.select().from(invoices).where(eq(invoices.clientId, client.id)).all().find((i) => i.status === "sent" && i.type === "invoice")!;
    const otherInv = saveInvoice(input({ clientId: other.id, type: "credit_note", relatedInvoiceId: issued.id }));
    expect(otherInv).toMatchObject({ error: expect.stringContaining("същия клиент") });
    expect(save({ type: "credit_note", relatedInvoiceId: issued.id })).toHaveProperty("id");
  });

  it("актовете се фактурират веднъж; изтрита чернова ги освобождава", () => {
    const a1 = mkAct("2099-01-08", 10), a2 = mkAct("2099-01-09", 5);
    const inv = save({ pouringIds: [a1, a2] }) as { id: number };
    expect(db.select().from(pourings).where(eq(pourings.id, a1)).get()!.invoiceId).toBe(inv.id);
    expect(save({ pouringIds: [a2] })).toMatchObject({ status: 409, error: expect.stringContaining(`Акт №${a2}`) });
    expect(saveInvoice(input({ clientId: other.id, pouringIds: [mkAct("2099-01-09", 1)] }))).toMatchObject({ error: expect.stringContaining("друг клиент") });

    // редакция на черновата без a2 → a2 е свободен
    save({ pouringIds: [a1] }, inv.id);
    expect(db.select().from(pourings).where(eq(pourings.id, a2)).get()!.invoiceId).toBeNull();

    const billed = invoicedBy(inv.id)!;
    expect(billedMessage(billed)).toMatch(/чернова/);
    expect(itemsChanged(a1, [{ concreteTypeId: 1, quantityM3: 10, pricePerM3: 150 }])).toBe(false);
    expect(itemsChanged(a1, [{ concreteTypeId: 1, quantityM3: 11, pricePerM3: 150 }])).toBe(true);

    expect(deleteDraftInvoice(inv.id)).toEqual({ ok: true });
    expect(db.select().from(pourings).where(eq(pourings.id, a1)).get()!.invoiceId).toBeNull();
  });
});
