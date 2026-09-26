import { db } from "@/db";
import { sites, offers, materials } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

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
export function applyStockDelta(tx: Tx, delta: Map<number, number>) {
  for (const [materialId, qty] of delta) {
    tx.update(materials)
      .set({ quantity: sql`${materials.quantity} - ${qty}` })
      .where(eq(materials.id, materialId))
      .run();
  }
}
