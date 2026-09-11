import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, isNotNull } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth.session && !auth.isApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ---------- Печалба по обект ----------
  const sites = await db
    .select({
      id: schema.sites.id,
      name: schema.sites.name,
      clientId: schema.sites.clientId,
      clientName: schema.clients.name,
      status: schema.sites.status,
    })
    .from(schema.sites)
    .leftJoin(schema.clients, eq(schema.sites.clientId, schema.clients.id))
    .orderBy(schema.sites.name)
    .all();

  const pourings = await db
    .select({ id: schema.pourings.id, siteId: schema.pourings.siteId })
    .from(schema.pourings)
    .all();

  const pouringIds = new Set(pourings.map((p) => p.id));
  const pouringSite = new Map(pourings.map((p) => [p.id, p.siteId]));

  // Приход: сума на редовете в актовете
  const pouringItems = await db
    .select({ pouringId: schema.pouringItems.pouringId, total: schema.pouringItems.total })
    .from(schema.pouringItems)
    .all();

  // Разход труд
  const actWorkers = await db
    .select({ pouringId: schema.actWorkers.pouringId, total: schema.actWorkers.total })
    .from(schema.actWorkers)
    .all();

  // Разход материали (с цена)
  const actMaterials = await db
    .select({
      pouringId: schema.actMaterials.pouringId,
      quantity: schema.actMaterials.quantity,
      pricePerUnit: schema.materials.pricePerUnit,
    })
    .from(schema.actMaterials)
    .leftJoin(schema.materials, eq(schema.actMaterials.materialId, schema.materials.id))
    .all();

  const bySite = new Map<number, { revenue: number; laborCost: number; materialCost: number }>();
  for (const s of sites) bySite.set(s.id, { revenue: 0, laborCost: 0, materialCost: 0 });

  for (const item of pouringItems) {
    const siteId = pouringSite.get(item.pouringId);
    if (siteId == null || !bySite.has(siteId)) continue;
    bySite.get(siteId)!.revenue += item.total || 0;
  }
  for (const w of actWorkers) {
    const siteId = pouringSite.get(w.pouringId);
    if (siteId == null || !bySite.has(siteId)) continue;
    bySite.get(siteId)!.laborCost += w.total || 0;
  }
  for (const m of actMaterials) {
    const siteId = pouringSite.get(m.pouringId);
    if (siteId == null || !bySite.has(siteId)) continue;
    bySite.get(siteId)!.materialCost += (m.quantity || 0) * (m.pricePerUnit || 0);
  }

  const profitBySite = sites.map((s) => {
    const agg = bySite.get(s.id)!;
    const revenue = round(agg.revenue);
    const laborCost = round(agg.laborCost);
    const materialCost = round(agg.materialCost);
    return {
      siteId: s.id,
      siteName: s.name,
      clientName: s.clientName || "—",
      status: s.status,
      revenue,
      laborCost,
      materialCost,
      totalCost: round(laborCost + materialCost),
      profit: round(revenue - laborCost - materialCost),
    };
  });

  // ---------- Оборот по клиент ----------
  const clients = await db
    .select({ id: schema.clients.id, name: schema.clients.name, companyName: schema.clients.companyName })
    .from(schema.clients)
    .orderBy(schema.clients.name)
    .all();

  const invoices = await db
    .select({
      clientId: schema.invoices.clientId,
      direction: schema.invoices.direction,
      status: schema.invoices.status,
      total: schema.invoices.total,
    })
    .from(schema.invoices)
    .all();

  const byClient = new Map<number, { invoiced: number; incoming: number }>();
  for (const c of clients) byClient.set(c.id, { invoiced: 0, incoming: 0 });

  for (const inv of invoices) {
    const key = inv.direction === "outgoing" ? inv.clientId : inv.clientId;
    if (!byClient.has(key)) continue;
    if (inv.direction === "outgoing" && inv.status !== "draft") {
      byClient.get(key)!.invoiced += inv.total || 0;
    } else if (inv.direction === "incoming" && inv.status !== "draft") {
      byClient.get(key)!.incoming += inv.total || 0;
    }
  }

  const revenueByClient = clients.map((c) => {
    const agg = byClient.get(c.id)!;
    return {
      clientId: c.id,
      clientName: c.companyName || c.name,
      invoiced: round(agg.invoiced),
      incoming: round(agg.incoming),
    };
  });

  // ---------- Разходи по машина ----------
  const machines = await db
    .select({ id: schema.machines.id, name: schema.machines.name, type: schema.machines.type })
    .from(schema.machines)
    .orderBy(schema.machines.name)
    .all();

  const maintenance = await db
    .select({
      machineId: schema.machineMaintenance.machineId,
      cost: schema.machineMaintenance.cost,
      date: schema.machineMaintenance.date,
    })
    .from(schema.machineMaintenance)
    .all();

  const byMachine = new Map<number, { count: number; totalCost: number; lastDate: string | null }>();
  for (const m of machines) byMachine.set(m.id, { count: 0, totalCost: 0, lastDate: null });

  for (const r of maintenance) {
    const agg = byMachine.get(r.machineId);
    if (!agg) continue;
    agg.count += 1;
    agg.totalCost += r.cost || 0;
    if (!agg.lastDate || (r.date && r.date > agg.lastDate)) agg.lastDate = r.date;
  }

  const machineCosts = machines.map((m) => {
    const agg = byMachine.get(m.id)!;
    return {
      machineId: m.id,
      machineName: m.name,
      type: m.type,
      maintenanceCount: agg.count,
      totalCost: round(agg.totalCost),
      lastMaintenance: agg.lastDate,
    };
  });

  // ---------- Справка за материали ----------
  const materials = await db
    .select({
      id: schema.materials.id,
      name: schema.materials.name,
      unit: schema.materials.unit,
      quantity: schema.materials.quantity,
      minThreshold: schema.materials.minThreshold,
      pricePerUnit: schema.materials.pricePerUnit,
    })
    .from(schema.materials)
    .orderBy(schema.materials.name)
    .all();

  const deliveries = await db
    .select({ materialId: schema.materialDeliveries.materialId, date: schema.materialDeliveries.date })
    .from(schema.materialDeliveries)
    .all();

  const byMaterial = new Map<number, { count: number; lastDate: string | null }>();
  for (const m of materials) byMaterial.set(m.id, { count: 0, lastDate: null });
  for (const d of deliveries) {
    const agg = byMaterial.get(d.materialId);
    if (!agg) continue;
    agg.count += 1;
    if (!agg.lastDate || (d.date && d.date > agg.lastDate)) agg.lastDate = d.date;
  }

  const materialsReport = materials.map((m) => {
    const agg = byMaterial.get(m.id)!;
    const qty = m.quantity || 0;
    const price = m.pricePerUnit || 0;
    return {
      id: m.id,
      name: m.name,
      unit: m.unit,
      quantity: qty,
      minThreshold: m.minThreshold || 0,
      pricePerUnit: price,
      stockValue: round(qty * price),
      deliveriesCount: agg.count,
      lastDelivery: agg.lastDate,
      low: (m.minThreshold || 0) > 0 && qty <= (m.minThreshold || 0),
    };
  });

  // ---------- Офертирано vs Актувано ----------
  const offers = await db
    .select({
      id: schema.offers.id,
      number: schema.offers.number,
      clientId: schema.offers.clientId,
      total: schema.offers.total,
      status: schema.offers.status,
    })
    .from(schema.offers)
    .orderBy(desc(schema.offers.id))
    .limit(100)
    .all();

  const offerItemsAll = await db
    .select({ offerId: schema.offerItems.offerId, quantityM3: schema.offerItems.quantityM3, total: schema.offerItems.total })
    .from(schema.offerItems)
    .all();

  const offersWithPourings = await db
    .select({ id: schema.pourings.id, offerId: schema.pourings.offerId, quantityM3: schema.pourings.quantityM3 })
    .from(schema.pourings)
    .where(isNotNull(schema.pourings.offerId))
    .all();

  const clientNames = new Map(clients.map((c) => [c.id, c.companyName || c.name]));

  const byOffer = new Map<number, { offeredM3: number; offeredTotal: number; actualM3: number; actualTotal: number }>();
  for (const o of offers) byOffer.set(o.id, { offeredM3: 0, offeredTotal: 0, actualM3: 0, actualTotal: 0 });
  for (const i of offerItemsAll) {
    const agg = byOffer.get(i.offerId);
    if (!agg) continue;
    agg.offeredM3 += i.quantityM3 || 0;
    agg.offeredTotal += i.total || 0;
  }
  for (const p of offersWithPourings) {
    if (p.offerId == null) continue;
    const agg = byOffer.get(p.offerId);
    if (!agg) continue;
    agg.actualM3 += p.quantityM3 || 0;
  }
  // актувано в пари — от pouring_items на актовете към офертата
  const actualTotalsByOffer = new Map<number, number>();
  for (const p of offersWithPourings) {
    if (p.offerId == null) continue;
    actualTotalsByOffer.set(p.offerId, 0);
  }
  // събираме сумите на актовете по оферта
  const pouringItemsByPouring = new Map<number, number>();
  for (const i of pouringItems) {
    pouringItemsByPouring.set(i.pouringId, (pouringItemsByPouring.get(i.pouringId) || 0) + (i.total || 0));
  }
  for (const p of offersWithPourings) {
    if (p.offerId == null) continue;
    const actTotal = pouringItemsByPouring.get(p.id) || 0;
    actualTotalsByOffer.set(p.offerId, (actualTotalsByOffer.get(p.offerId) || 0) + actTotal);
  }

  const offeredVsActual = offers.map((o) => {
    const agg = byOffer.get(o.id)!;
    return {
      offerId: o.id,
      number: o.number,
      clientName: clientNames.get(o.clientId) || "—",
      status: o.status,
      offeredM3: round(agg.offeredM3),
      offeredTotal: round(agg.offeredTotal || o.total),
      actualM3: round(agg.actualM3),
      actualTotal: round(actualTotalsByOffer.get(o.id) || 0),
    };
  });

  return NextResponse.json({
    profitBySite,
    revenueByClient,
    machineCosts,
    materialsReport,
    offeredVsActual,
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
