import { randomUUID } from "crypto";
import { and, eq, inArray, max, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoiceItems, invoices, pourings, sites } from "@/db/schema";
import { calcInvoiceTotals, nextInvoiceNumber, roundMoney } from "@/lib/calc";
import { DRAFT_PREFIX, checkInvoiceRules, nextProformaNumber, type InvoiceInput } from "@/lib/invoices";

export type Fail = { error: string; status: number };
const fail = (error: string, status = 400): Fail => ({ error, status });

/** Издадени изходящи номера от дадена поредица (данъчни документи или проформи). */
function issuedNumbers(proforma: boolean): string[] {
  return db.select({ number: invoices.number }).from(invoices).where(and(
    eq(invoices.direction, "outgoing"),
    ne(invoices.status, "draft"),
    proforma ? eq(invoices.type, "proforma") : ne(invoices.type, "proforma"),
  )).all().map((r) => r.number);
}

/** Номерът, който ще получи изходящ документ при издаване (или следващ входящ). */
export function previewNumber(direction: "outgoing" | "incoming", type = "invoice"): string {
  if (direction === "incoming") {
    const rows = db.select({ number: invoices.number }).from(invoices).where(eq(invoices.direction, "incoming")).all();
    return nextInvoiceNumber("incoming", rows.map((r) => r.number));
  }
  return type === "proforma" ? nextProformaNumber(issuedNumbers(true)) : nextInvoiceNumber("outgoing", issuedNumbers(false));
}

/** Проверки, които изискват базата. excludeId — фактурата, която се редактира. */
function checkRefs(d: InvoiceInput, excludeId?: number): Fail | null {
  const client = db.select({ id: clients.id }).from(clients).where(eq(clients.id, d.clientId)).get();
  if (!client) return fail("Клиентът не съществува");

  if (d.direction === "incoming") {
    const dup = db.select({ id: invoices.id }).from(invoices)
      .where(and(eq(invoices.direction, "incoming"), eq(invoices.number, d.number!.trim()))).get();
    if (dup && dup.id !== excludeId) return fail(`Входяща фактура с номер ${d.number} вече има`, 409);
  }

  // Кредитно/дебитно известие сочи издадена фактура на същия клиент (чл. 115 ЗДДС)
  if (d.type === "credit_note" || d.type === "debit_note") {
    const rel = d.relatedInvoiceId
      ? db.select().from(invoices).where(eq(invoices.id, d.relatedInvoiceId)).get()
      : null;
    if (!rel) return fail("Изберете фактурата, към която е известието");
    if (rel.direction !== d.direction || rel.type !== "invoice") return fail("Известието трябва да е към фактура (не проформа или друго известие)");
    if (rel.status === "draft") return fail("Известие се издава само към издадена фактура");
    if (rel.clientId !== d.clientId) return fail("Известието трябва да е за същия клиент като фактурата");
  }

  if (d.pouringIds.length) {
    const acts = db.select({ id: pourings.id, invoiceId: pourings.invoiceId, clientId: sites.clientId })
      .from(pourings).leftJoin(sites, eq(pourings.siteId, sites.id))
      .where(inArray(pourings.id, d.pouringIds)).all();
    if (acts.length !== new Set(d.pouringIds).size) return fail("Някой от актовете не съществува");
    for (const a of acts) {
      if (a.clientId !== d.clientId) return fail(`Акт №${a.id} е на обект на друг клиент`);
      if (a.invoiceId && a.invoiceId !== excludeId) {
        const other = db.select({ number: invoices.number }).from(invoices).where(eq(invoices.id, a.invoiceId)).get();
        return fail(`Акт №${a.id} вече е фактуриран${other ? ` (${other.number})` : ""}`, 409);
      }
    }
  }
  return null;
}

/**
 * Създава фактура (existingId = null) или заменя чернова. Изходящите остават чернови
 * с временен номер до издаването; актовете се свързват в същата транзакция.
 */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function saveInvoice(
  d: InvoiceInput,
  existingId: number | null = null,
  onSaved?: (tx: Tx, id: number) => void, // допълнителни записи в същата транзакция
): Fail | { id: number } {
  const ruleError = checkInvoiceRules(d);
  if (ruleError) return fail(ruleError);
  if (existingId) {
    const cur = db.select({ status: invoices.status, direction: invoices.direction }).from(invoices).where(eq(invoices.id, existingId)).get();
    if (!cur) return fail("Не е намерена", 404);
    if (cur.status !== "draft") return fail("Издадена фактура не се редактира — издайте кредитно/дебитно известие", 409);
    if (cur.direction !== d.direction) return fail("Посоката на фактурата не може да се сменя");
  }
  const refError = checkRefs(d, existingId ?? undefined);
  if (refError) return refError;

  const totals = calcInvoiceTotals(d.items, d.discountPercent, d.discountAmount);
  const isNote = d.type === "credit_note" || d.type === "debit_note";
  const values = {
    clientId: d.clientId,
    supplierId: d.supplierId || null,
    date: d.date,
    dueDate: d.dueDate,
    taxEventDate: d.taxEventDate,
    direction: d.direction,
    type: d.type,
    currency: d.currency,
    subtotal: totals.subtotal,
    discountPercent: d.discountPercent,
    discountAmount: d.discountAmount,
    vatRate: d.items[0]?.vatRate ?? 20,
    vatAmount: totals.vatAmount,
    total: totals.total,
    paymentMethod: d.paymentMethod,
    paymentStatus: d.paymentStatus,
    relatedInvoiceId: isNote ? d.relatedInvoiceId ?? null : null,
    taxExemptionReason: d.taxExemptionReason?.trim() || null,
    notes: d.notes?.trim() || null,
    updatedAt: new Date().toISOString(),
  };

  const id = db.transaction((tx) => {
    let id = existingId;
    if (id) {
      tx.update(invoices).set({
        ...values,
        ...(d.direction === "incoming" ? { number: d.number!.trim() } : {}),
      }).where(eq(invoices.id, id)).run();
      tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id)).run();
      tx.update(pourings).set({ invoiceId: null }).where(eq(pourings.invoiceId, id)).run();
    } else {
      const number = d.direction === "incoming" ? d.number!.trim() : `${DRAFT_PREFIX}${randomUUID()}`;
      id = tx.insert(invoices).values({ ...values, number, status: "draft" }).returning({ id: invoices.id }).get().id;
      if (d.direction === "outgoing") {
        tx.update(invoices).set({ number: `${DRAFT_PREFIX}${id}` }).where(eq(invoices.id, id)).run();
      }
    }
    for (const item of d.items) {
      tx.insert(invoiceItems).values({
        invoiceId: id,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        price: item.price,
        vatRate: item.vatRate,
        total: roundMoney(item.quantity * item.price),
      }).run();
    }
    if (d.pouringIds.length) {
      tx.update(pourings).set({ invoiceId: id }).where(inArray(pourings.id, d.pouringIds)).run();
    }
    onSaved?.(tx, id);
    return id;
  });
  return { id };
}

/**
 * Издава чернова. Изходящият документ получава следващия номер от поредицата си;
 * датата не може да е преди последния издаден документ (номерата следват датите).
 */
export function issueInvoice(id: number): Fail | { number: string } {
  return db.transaction((tx) => {
    const inv = tx.select().from(invoices).where(eq(invoices.id, id)).get();
    if (!inv) return fail("Не е намерена", 404);
    if (inv.status !== "draft") return fail("Фактурата вече е издадена", 409);
    const itemCount = tx.select({ id: invoiceItems.id }).from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).all().length;
    if (!itemCount) return fail("Фактурата няма редове");

    let number = inv.number;
    if (inv.direction === "outgoing") {
      const proforma = inv.type === "proforma";
      const seq = and(
        eq(invoices.direction, "outgoing"),
        ne(invoices.status, "draft"),
        proforma ? eq(invoices.type, "proforma") : ne(invoices.type, "proforma"),
      );
      const last = tx.select({ date: max(invoices.date) }).from(invoices).where(seq).get();
      if (last?.date && inv.date < last.date) {
        return fail(`Датата ${fmt(inv.date)} е преди последния издаден документ (${fmt(last.date)}). Номерата трябва да следват датите — сменете датата на черновата.`, 409);
      }
      const numbers = tx.select({ number: invoices.number }).from(invoices).where(seq).all().map((r) => r.number);
      number = proforma ? nextProformaNumber(numbers) : nextInvoiceNumber("outgoing", numbers);
      // Стара чернова може да държи този номер (преди номерът се даваше при създаване)
      tx.update(invoices).set({ number: sql`${DRAFT_PREFIX} || ${invoices.id}` })
        .where(and(eq(invoices.direction, "outgoing"), eq(invoices.status, "draft"), eq(invoices.number, number), ne(invoices.id, id))).run();
    }
    tx.update(invoices).set({ number, status: "sent", updatedAt: new Date().toISOString() }).where(eq(invoices.id, id)).run();
    return { number };
  });
}

/** Изтрива чернова; актовете ѝ стават отново нефактурирани. */
export function deleteDraftInvoice(id: number): Fail | { ok: true } {
  const cur = db.select({ status: invoices.status }).from(invoices).where(eq(invoices.id, id)).get();
  if (!cur) return fail("Не е намерена", 404);
  // Издадена фактура не се трие (пропуск в номерацията) — анулира се с кредитно известие
  if (cur.status !== "draft") return fail("Издадена фактура не може да се изтрие — издайте кредитно известие", 409);
  const notes = db.select({ id: invoices.id }).from(invoices).where(eq(invoices.relatedInvoiceId, id)).get();
  if (notes) return fail("Към черновата има известие — изтрийте първо него", 409);
  db.transaction((tx) => {
    tx.update(pourings).set({ invoiceId: null }).where(eq(pourings.invoiceId, id)).run();
    tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id)).run();
    tx.delete(invoices).where(eq(invoices.id, id)).run();
  });
  return { ok: true };
}

function fmt(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}
