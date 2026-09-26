import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseInvoicePdf, parseInvoiceText } from "@/lib/invoice-parser";
import { importIncomingEmail } from "@/lib/incoming-invoice";
import { db } from "@/db";
import { clients, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";

// Входяща фактура от „Цимент АД“ към нас („Бетон ЕООД“, ЕИК 111222333) —
// нашият ЕИК е ПЪРВИ в текста (в заглавката).
const OWN = { eik: "111222333", vatNumber: "BG111222333" };
const pdf = readFileSync(path.resolve("tests/fixtures/incoming-invoice.pdf"));

describe("парсер на входящи фактури", () => {
  it("чете PDF (pdf-parse v2) и разпознава доставчика, а не нас", async () => {
    const r = await parseInvoicePdf(pdf, OWN);
    expect(r.supplierEik).toBe("987654321");
    expect(r.supplierName).toBe("Цимент АД");
    expect(r.invoiceNumber).toBe("ВХ-000001");
    expect(r.date).toBe("2026-09-20");
    expect(r.total).toBe(600);
    expect(r.vatAmount).toBe(100);
    expect(r.confidence).toBe("high");
  });

  it("без данни за нашата фирма взима първия ЕИК (старото поведение)", async () => {
    expect((await parseInvoicePdf(pdf)).supplierEik).toBe("111222333");
  });

  it("сума с интервали и запетая, „Сума за плащане“", () => {
    const r = parseInvoiceText("Фактура № 0000012345\nДДС: 208,33\nСума за плащане: 1 250,00 лв.");
    expect(r.total).toBe(1250);
    expect(r.vatAmount).toBe(208.33);
  });
});

describe("импорт на входяща фактура от имейл", () => {
  const email = (uid: number, from = "Цимент АД <office@ciment.bg>") => ({
    uid, subject: "Фактура", from, date: new Date("2026-09-20"), text: "", attachments: [],
  });
  const att = { filename: "f.pdf", content: Buffer.from("%PDF-test") };

  it("създава доставчик и чернова с основа без ДДС; повторният имейл е дубликат", async () => {
    const uid = 900000 + Math.floor(Math.random() * 99999);
    const parsed = { ...(await parseInvoicePdf(pdf, OWN)), supplierEik: `9${uid}00`.slice(0, 9), invoiceNumber: `T-${uid}` };
    const r = importIncomingEmail(email(uid), parsed, att);
    expect(r.status).toBe("created");
    if (r.status !== "created") return;
    const inv = db.select().from(invoices).where(eq(invoices.id, r.id)).get()!;
    expect(inv.subtotal).toBe(500);
    expect(inv.vatAmount).toBe(100);
    expect(inv.total).toBe(600);
    expect(inv.status).toBe("draft");
    expect(JSON.parse(inv.notes!).originalNumber).toBe(`T-${uid}`);
    const supplier = db.select().from(clients).where(eq(clients.id, inv.clientId)).get()!;
    expect(supplier.eik).toBe(parsed.supplierEik);

    // същият имейл пак → дубликат; същата фактура от друг имейл → дубликат
    expect(importIncomingEmail(email(uid), parsed, att).status).toBe("duplicate");
    expect(importIncomingEmail(email(uid + 1), parsed, att).status).toBe("duplicate");
  });

  it("без разпознат ЕИК — доставчик от подателя (преди clientId=0 → грешка)", () => {
    const uid = 800000 + Math.floor(Math.random() * 99999);
    const parsed = parseInvoiceText(`Сметка ${uid}\nОБЩО: 120.00`);
    const r = importIncomingEmail(email(uid, `Доставчик ${uid} <x${uid}@mail.bg>`), parsed, att);
    expect(r.status).toBe("created");
    if (r.status !== "created") return;
    const inv = db.select().from(invoices).where(eq(invoices.id, r.id)).get()!;
    const supplier = db.select().from(clients).where(eq(clients.id, inv.clientId)).get()!;
    expect(supplier.name).toBe(`Доставчик ${uid}`);
    expect(supplier.email).toBe(`x${uid}@mail.bg`);
    expect(supplier.notes).toMatch(/проверете/);
  });
});
