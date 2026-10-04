import { db } from "@/db";
import { sites, offers, materials, invoices, pourings, pouringItems } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";

// Обектът трябва да съществува; офертата (ако има) — да е за същия обект
// (или, ако офертата няма обект, за същия клиент).
export function checkActRefs(siteId: number, offerId: number | null): string | null {
  const site = db.select({ id: sites.id, clientId: sites.clientId }).from(sites).where(eq(sites.id, siteId)).get();
  if (!site) return "Обектът не съществува";
  if (offerId != null) {
    const offer = db.select({ siteId: offers.siteId, clientId: offers.clientId }).from(offers).where(eq(offers.id, offerId)).get();
    if (!offer) return "Офертата не съществува";
    if (offer.siteId != null ? offer.siteId !== siteId : offer.clientId !== site.clientId) {
      return "Офертата е за друг обект";
    }
  }
  return null;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Намалява наличността с delta (отрицателно delta връща в склада). Вика се в транзакция.
// Връща предупреждения за материали, които излизат на минус (актът се записва — изляното
// е факт, но складът трябва да се коригира с приход).
export function applyStockDelta(tx: Tx, delta: Map<number, number>): string[] {
  const warnings: string[] = [];
  for (const [materialId, qty] of delta) {
    const m = tx.update(materials)
      .set({ quantity: sql`${materials.quantity} - ${qty}` })
      .where(eq(materials.id, materialId))
      .returning({ name: materials.name, quantity: materials.quantity, unit: materials.unit })
      .get();
    if (m && qty > 0 && m.quantity < -1e-9) {
      warnings.push(`${m.name}: недостиг ${Math.round(-m.quantity * 1000) / 1000} ${m.unit} — запишете приход в склада`);
    }
  }
  return warnings;
}

/** Цена за единица за всеки изписан материал: запазва досегашната за вече изписаните, текущата за новите. */
export function materialUnitCosts(tx: Tx, before: { materialId: number; unitCost: number | null }[], materialIds: number[]) {
  const costs = new Map<number, number | null>();
  for (const b of before) if (b.unitCost != null && !costs.has(b.materialId)) costs.set(b.materialId, b.unitCost);
  for (const id of materialIds) {
    if (costs.has(id)) continue;
    costs.set(id, tx.select({ p: materials.pricePerUnit }).from(materials).where(eq(materials.id, id)).get()?.p ?? null);
  }
  return costs;
}

// ---- Фактурирани актове ----

/** Фактурата, с която е фактуриран актът (или null). */
export function invoicedBy(invoiceId: number | null): { id: number; number: string; status: string } | null {
  if (!invoiceId) return null;
  return db.select({ id: invoices.id, number: invoices.number, status: invoices.status })
    .from(invoices).where(eq(invoices.id, invoiceId)).get() ?? null;
}

export function billedMessage(inv: { number: string; status: string }): string {
  return inv.status === "draft"
    ? `Актът е в чернова на фактура (${inv.number}). Промени по количества, цени, обект и дата не са позволени — първо махнете акта от черновата или я изтрийте.`
    : `Актът е фактуриран с фактура № ${inv.number}. Промени по количества, цени, обект и дата не са позволени — корекция се прави с кредитно/дебитно известие.`;
}

/** Различават ли се новите редове от записаните (тип, количество, цена, в същия ред). */
export function itemsChanged(pouringId: number, items: { concreteTypeId: number; quantityM3: number; pricePerM3: number }[]): boolean {
  const cur = db.select({ concreteTypeId: pouringItems.concreteTypeId, quantityM3: pouringItems.quantityM3, pricePerM3: pouringItems.pricePerM3 })
    .from(pouringItems).where(eq(pouringItems.pouringId, pouringId)).orderBy(asc(pouringItems.sortOrder), asc(pouringItems.id)).all();
  if (cur.length !== items.length) return true;
  const eps = 1e-9;
  return cur.some((c, i) => c.concreteTypeId !== items[i].concreteTypeId
    || Math.abs(c.quantityM3 - items[i].quantityM3) > eps
    || Math.abs(c.pricePerM3 - items[i].pricePerM3) > eps);
}

export function currentDate(pouringId: number): string | undefined {
  return db.select({ date: pourings.date }).from(pourings).where(eq(pourings.id, pouringId)).get()?.date;
}
