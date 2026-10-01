import { describe, it, expect, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clients, sites, pourings, pouringItems, offers, invoices, siteCalendar } from "@/db/schema";
import { siteOverview } from "@/lib/sites-db";

describe("siteOverview", () => {
  const client = db.insert(clients).values({ name: "Обект тест " + Date.now() }).returning().get();
  const site = db.insert(sites).values({ clientId: client.id, name: "Тест", address: "ул. 1" }).returning().get();
  const offer = db.insert(offers).values({ clientId: client.id, siteId: site.id, number: "ОФ-T-" + Date.now(), date: "2099-01-01", total: 3000, status: "accepted" }).returning().get();
  const inv = db.insert(invoices).values({ clientId: client.id, number: "T-" + Date.now(), date: "2099-01-02", dueDate: "2099-01-02", taxEventDate: "2099-01-02", status: "sent" }).returning().get();
  const act = (qty: number, price: number, invoiceId: number | null) => {
    const a = db.insert(pourings).values({ siteId: site.id, offerId: offer.id, date: "2099-01-02", quantityM3: qty, invoiceId }).returning().get();
    db.insert(pouringItems).values({ pouringId: a.id, concreteTypeId: 1, quantityM3: qty, pricePerM3: price, total: qty * price }).run();
    return a.id;
  };
  const ids = [act(10, 150, inv.id), act(4.5, 160, null)];
  db.insert(siteCalendar).values({ siteId: site.id, plannedDate: "2099-02-01", estimatedM3: 8, status: "planned" }).run();

  afterAll(() => {
    db.delete(siteCalendar).where(eq(siteCalendar.siteId, site.id)).run();
    db.delete(pouringItems).where(inArray(pouringItems.pouringId, ids)).run();
    db.delete(pourings).where(inArray(pourings.id, ids)).run();
    db.delete(invoices).where(eq(invoices.id, inv.id)).run();
    db.delete(offers).where(eq(offers.id, offer.id)).run();
    db.delete(sites).where(eq(sites.id, site.id)).run();
    db.delete(clients).where(eq(clients.id, client.id)).run();
  });

  it("обобщение: оферирано, изляно, фактурирано, чака фактура", () => {
    const o = siteOverview(site.id, true);
    expect(o.summary).toEqual({
      actsCount: 2, pouredM3: 14.5, unbilledCount: 1, unbilledM3: 4.5,
      offered: 3000, pouredValue: 2220, invoicedValue: 1500, unbilledValue: 720,
    });
    expect(o.acts.find((a) => a.id === ids[0])!.invoice?.number).toBe(inv.number);
    expect(o.offers).toHaveLength(1);
    expect(o.upcoming).toHaveLength(1);
  });

  it("бригадир: без суми, оферти и фактури", () => {
    const o = siteOverview(site.id, false);
    expect(o.summary).toEqual({ actsCount: 2, pouredM3: 14.5, unbilledCount: 1, unbilledM3: 4.5 });
    expect(o.offers).toEqual([]);
    expect(o.acts.every((a) => a.total === null && a.invoice === null)).toBe(true);
  });
});
