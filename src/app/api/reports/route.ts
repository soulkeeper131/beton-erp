import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";
import { invoiceSign, inPeriod, parsePeriod } from "@/lib/reports";

export const dynamic = "force-dynamic";

// GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD (периодът е по избор, двете граници включително)
export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth.session && !auth.isApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((auth.session?.user as any)?.role === "brigadir") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = parsePeriod(searchParams.get("from"), searchParams.get("to"));
  if (!period) {
    return NextResponse.json({ error: "Невалиден период (очаква се YYYY-MM-DD)" }, { status: 400 });
  }
  const within = (date: string | null | undefined) => inPeriod(date, period);

  const clients = await db
    .select({ id: schema.clients.id, name: schema.clients.name, companyName: schema.clients.companyName })
    .from(schema.clients)
    .orderBy(schema.clients.name)
    .all();
  const clientNames = new Map(clients.map((c) => [c.id, c.companyName || c.name]));

  // ---------- Печалба по обект ----------
  const sites = await db
    .select({
      id: schema.sites.id,
      name: schema.sites.name,
      clientId: schema.sites.clientId,
      status: schema.sites.status,
    })
    .from(schema.sites)
    .orderBy(schema.sites.name)
    .all();

  const allPourings = await db
    .select({
      id: schema.pourings.id,
      siteId: schema.pourings.siteId,
      offerId: schema.pourings.offerId,
      date: schema.pourings.date,
      quantityM3: schema.pourings.quantityM3,
    })
    .from(schema.pourings)
    .all();

  // Актовете в периода — за печалба и разход на материали
  const pouringSite = new Map(allPourings.filter((p) => within(p.date)).map((p) => [p.id, p.siteId]));

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

  // Разход материали — по цената към момента на изписване (стари записи без нея: текущата)
  const actMaterials = await db
    .select({
      pouringId: schema.actMaterials.pouringId,
      materialId: schema.actMaterials.materialId,
      quantity: schema.actMaterials.quantity,
      pricePerUnit: sql<number | null>`coalesce(${schema.actMaterials.unitCost}, ${schema.materials.pricePerUnit})`,
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
      clientName: clientNames.get(s.clientId) || "—",
      status: s.status,
      revenue,
      laborCost,
      materialCost,
      totalCost: round(laborCost + materialCost),
      profit: round(revenue - laborCost - materialCost),
    };
  });

  // ---------- Оборот по клиент / доставчик ----------
  // При входящите фактури clientId е доставчикът. Проформите не са данъчни документи
  // и не се броят; кредитните известия намаляват сумата.
  const invoices = await db
    .select({
      clientId: schema.invoices.clientId,
      direction: schema.invoices.direction,
      type: schema.invoices.type,
      status: schema.invoices.status,
      date: schema.invoices.date,
      total: schema.invoices.total,
    })
    .from(schema.invoices)
    .all();

  const byClient = new Map<number, { invoiced: number; incoming: number }>();
  for (const c of clients) byClient.set(c.id, { invoiced: 0, incoming: 0 });

  for (const inv of invoices) {
    const agg = byClient.get(inv.clientId);
    if (!agg || inv.status === "draft" || !within(inv.date)) continue;
    const amount = invoiceSign(inv.type) * Math.abs(inv.total || 0);
    if (inv.direction === "outgoing") agg.invoiced += amount;
    else if (inv.direction === "incoming") agg.incoming += amount;
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
    if (!agg || !within(r.date)) continue;
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
  // Наличността и стойността са към днешна дата; доставките и изразходваното — за периода.
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
    .select({
      materialId: schema.materialDeliveries.materialId,
      date: schema.materialDeliveries.date,
      quantity: schema.materialDeliveries.quantity,
    })
    .from(schema.materialDeliveries)
    .all();

  const byMaterial = new Map<number, { count: number; delivered: number; consumed: number; lastDate: string | null }>();
  for (const m of materials) byMaterial.set(m.id, { count: 0, delivered: 0, consumed: 0, lastDate: null });
  for (const d of deliveries) {
    const agg = byMaterial.get(d.materialId);
    if (!agg || !within(d.date)) continue;
    const q = d.quantity || 0;
    // Отрицателно движение = ръчен разход от склада
    if (q < 0) {
      agg.consumed += -q;
      continue;
    }
    agg.count += 1;
    agg.delivered += q;
    if (!agg.lastDate || (d.date && d.date > agg.lastDate)) agg.lastDate = d.date;
  }
  for (const m of actMaterials) {
    const agg = byMaterial.get(m.materialId);
    if (!agg || !pouringSite.has(m.pouringId)) continue;
    agg.consumed += m.quantity || 0;
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
      delivered: round(agg.delivered),
      consumed: round(agg.consumed),
      lastDelivery: agg.lastDate,
      low: (m.minThreshold || 0) > 0 && qty <= (m.minThreshold || 0),
    };
  });

  // ---------- Офертирано vs Актувано ----------
  // Офертите се филтрират по дата на офертата; актуваното включва всички актове към нея.
  const offers = (
    await db
      .select({
        id: schema.offers.id,
        number: schema.offers.number,
        clientId: schema.offers.clientId,
        date: schema.offers.date,
        total: schema.offers.total,
        status: schema.offers.status,
      })
      .from(schema.offers)
      .orderBy(desc(schema.offers.id))
      .all()
  ).filter((o) => o.status !== "draft" && within(o.date));

  const offerItemsAll = await db
    .select({ offerId: schema.offerItems.offerId, quantityM3: schema.offerItems.quantityM3, total: schema.offerItems.total })
    .from(schema.offerItems)
    .all();

  const pouringTotals = new Map<number, number>();
  for (const i of pouringItems) {
    pouringTotals.set(i.pouringId, (pouringTotals.get(i.pouringId) || 0) + (i.total || 0));
  }

  const byOffer = new Map<number, { offeredM3: number; offeredTotal: number; actualM3: number; actualTotal: number }>();
  for (const o of offers) byOffer.set(o.id, { offeredM3: 0, offeredTotal: 0, actualM3: 0, actualTotal: 0 });
  for (const i of offerItemsAll) {
    const agg = byOffer.get(i.offerId);
    if (!agg) continue;
    agg.offeredM3 += i.quantityM3 || 0;
    agg.offeredTotal += i.total || 0;
  }
  for (const p of allPourings) {
    if (p.offerId == null) continue;
    const agg = byOffer.get(p.offerId);
    if (!agg) continue;
    agg.actualM3 += p.quantityM3 || 0;
    agg.actualTotal += pouringTotals.get(p.id) || 0;
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
      actualTotal: round(agg.actualTotal),
    };
  });

  return NextResponse.json({
    period,
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
