import { z } from "zod";
import { db } from "@/db";
import { offers, offerItems } from "@/db/schema";
import { desc, eq, like } from "drizzle-orm";
import { roundMoney } from "@/lib/calc";

// Обща логика за оферти — API, формите и агентът минават оттук.

export const offerItemSchema = z
  .object({
    concreteTypeId: z.coerce.number().int().positive().optional().nullable(),
    serviceId: z.coerce.number().int().positive().optional().nullable(),
    quantityM3: z.coerce.number({ invalid_type_error: "Въведете количество" }).positive("Количеството трябва да е положително"),
    pricePerM3: z.coerce.number({ invalid_type_error: "Въведете цена" }).min(0, "Цената не може да е отрицателна"),
    transportCost: z.coerce.number().min(0).optional().default(0),
    pumpCost: z.coerce.number().min(0).optional().default(0),
  })
  .refine((d) => d.concreteTypeId || d.serviceId, {
    message: "Изберете тип бетон или услуга",
    path: ["concreteTypeId"],
  });

export type OfferItemInput = z.infer<typeof offerItemSchema>;

export function offerItemTotal(i: { quantityM3: number; pricePerM3: number; transportCost?: number | null; pumpCost?: number | null }) {
  return roundMoney(i.quantityM3 * i.pricePerM3 + (i.transportCost || 0) + (i.pumpCost || 0));
}

export function offerTotal(items: Parameters<typeof offerItemTotal>[0][]) {
  return roundMoney(items.reduce((s, i) => s + offerItemTotal(i), 0));
}

/** Следващ номер ОФ-<година>-NNNN (MAX + 1 за годината). */
export function getNextOfferNumber(year = new Date().getFullYear()): string {
  const prefix = `ОФ-${year}-`;
  const last = db
    .select({ number: offers.number })
    .from(offers)
    .where(like(offers.number, `${prefix}%`))
    .orderBy(desc(offers.number))
    .limit(1)
    .get();
  const seq = last?.number.match(/(\d+)$/)?.[1];
  return `${prefix}${String((seq ? parseInt(seq, 10) : 0) + 1).padStart(4, "0")}`;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Заменя всички редове на офертата и преизчислява сумата. Вика се в транзакция. */
export function replaceOfferItems(tx: Tx, offerId: number, items: OfferItemInput[]) {
  tx.delete(offerItems).where(eq(offerItems.offerId, offerId)).run();
  for (const item of items) {
    tx.insert(offerItems).values({
      offerId,
      concreteTypeId: item.concreteTypeId || null,
      serviceId: item.serviceId || null,
      quantityM3: item.quantityM3,
      pricePerM3: item.pricePerM3,
      transportCost: item.transportCost || 0,
      pumpCost: item.pumpCost || 0,
      total: offerItemTotal(item),
    }).run();
  }
  tx.update(offers).set({ total: offerTotal(items) }).where(eq(offers.id, offerId)).run();
}

/** Преизчислява сумата на офертата от редовете ѝ (след добавяне/промяна/изтриване на ред). */
export function recalcOfferTotal(tx: Tx, offerId: number) {
  const items = tx.select().from(offerItems).where(eq(offerItems.offerId, offerId)).all();
  tx.update(offers).set({ total: offerTotal(items) }).where(eq(offers.id, offerId)).run();
}
