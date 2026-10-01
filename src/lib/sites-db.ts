import { and, asc, desc, eq, gte, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { concreteTypes, invoices, machines, offers, pouringItems, pourings, siteCalendar } from "@/db/schema";
import { roundMoney } from "@/lib/calc";
import { today } from "@/lib/dates";

/**
 * Всичко за един обект на едно място: оферти, актове (с фактурата им), предстоящи
 * наливания и обобщение колко е оферирано, изляно, фактурирано и чака фактура.
 * finance=false (бригадир) — без суми.
 */
export function siteOverview(siteId: number, finance: boolean) {
  const acts = db.select({
    id: pourings.id, date: pourings.date, status: pourings.status, offerId: pourings.offerId,
    invoiceId: pourings.invoiceId, invoiceNumber: invoices.number, invoiceStatus: invoices.status,
    offerNumber: offers.number,
  }).from(pourings)
    .leftJoin(invoices, eq(pourings.invoiceId, invoices.id))
    .leftJoin(offers, eq(pourings.offerId, offers.id))
    .where(eq(pourings.siteId, siteId)).orderBy(desc(pourings.date), desc(pourings.id)).all();

  const items = acts.length
    ? db.select({ pouringId: pouringItems.pouringId, quantityM3: pouringItems.quantityM3, total: pouringItems.total })
      .from(pouringItems).where(inArray(pouringItems.pouringId, acts.map((a) => a.id))).all()
    : [];
  const byAct = new Map<number, { m3: number; total: number }>();
  for (const i of items) {
    const cur = byAct.get(i.pouringId) || { m3: 0, total: 0 };
    byAct.set(i.pouringId, { m3: cur.m3 + (i.quantityM3 || 0), total: cur.total + (i.total || 0) });
  }

  const actRows = acts.map((a) => {
    const t = byAct.get(a.id) || { m3: 0, total: 0 };
    return {
      id: a.id, date: a.date, offerId: a.offerId, offerNumber: a.offerNumber,
      quantityM3: roundMoney(t.m3),
      total: finance ? roundMoney(t.total) : null,
      invoice: finance && a.invoiceId ? { id: a.invoiceId, number: a.invoiceNumber, status: a.invoiceStatus } : null,
      invoiced: !!a.invoiceId,
    };
  });

  const siteOffers = finance
    ? db.select({ id: offers.id, number: offers.number, date: offers.date, validUntil: offers.validUntil, status: offers.status, total: offers.total })
      .from(offers).where(eq(offers.siteId, siteId)).orderBy(desc(offers.date)).all()
    : [];

  const upcoming = db.select({
    id: siteCalendar.id, plannedDate: siteCalendar.plannedDate, estimatedM3: siteCalendar.estimatedM3,
    status: siteCalendar.status, notes: siteCalendar.notes,
    concreteTypeName: concreteTypes.name, machineName: machines.name,
  }).from(siteCalendar)
    .leftJoin(concreteTypes, eq(siteCalendar.concreteTypeId, concreteTypes.id))
    .leftJoin(machines, eq(siteCalendar.machineId, machines.id))
    .where(and(eq(siteCalendar.siteId, siteId), gte(siteCalendar.plannedDate, today()), ne(siteCalendar.status, "done")))
    .orderBy(asc(siteCalendar.plannedDate)).limit(10).all();

  const sum = (rows: typeof actRows, f: (r: (typeof actRows)[number]) => number) => roundMoney(rows.reduce((s, r) => s + f(r), 0));
  const unbilled = actRows.filter((a) => !a.invoiced);
  const billed = actRows.filter((a) => a.invoice?.status === "sent");
  const summary = {
    actsCount: actRows.length,
    pouredM3: sum(actRows, (a) => a.quantityM3),
    unbilledCount: unbilled.length,
    unbilledM3: sum(unbilled, (a) => a.quantityM3),
    ...(finance ? {
      offered: roundMoney(siteOffers.filter((o) => o.status === "sent" || o.status === "accepted").reduce((s, o) => s + (o.total || 0), 0)),
      pouredValue: sum(actRows, (a) => a.total || 0),
      invoicedValue: sum(billed, (a) => a.total || 0),
      unbilledValue: sum(unbilled, (a) => a.total || 0),
    } : {}),
  };

  return { acts: actRows, offers: siteOffers, upcoming, summary };
}
