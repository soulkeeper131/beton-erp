import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { pourings, pouringItems, sites, offers, concreteTypes, machines } from "@/db/schema";
import { eq, desc, asc, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const offerId = searchParams.get("offerId");

  let where: any = undefined;
  if (offerId) where = eq(pourings.offerId, parseInt(offerId));
  else if (siteId) where = eq(pourings.siteId, parseInt(siteId));

  const result = await db.select({
    id: pourings.id,
    date: pourings.date,
    status: pourings.status,
    weather: pourings.weather,
    notes: pourings.notes,
    siteId: pourings.siteId,
    offerId: pourings.offerId,
    machineId: pourings.machineId,
    site: { id: sites.id, name: sites.name },
    offer: { id: offers.id, number: offers.number },
    machine: { id: machines.id, name: machines.name },
  })
    .from(pourings)
    .leftJoin(sites, eq(pourings.siteId, sites.id))
    .leftJoin(offers, eq(pourings.offerId, offers.id))
    .leftJoin(machines, eq(pourings.machineId, machines.id))
    .where(where)
    .orderBy(desc(pourings.date));

  // Attach items
  const pouringIds = result.map(p => p.id);
  if (pouringIds.length > 0) {
    const allItems = await db.select({
      id: pouringItems.id,
      pouringId: pouringItems.pouringId,
      concreteTypeId: pouringItems.concreteTypeId,
      quantityM3: pouringItems.quantityM3,
      pricePerM3: pouringItems.pricePerM3,
      total: pouringItems.total,
      concreteTypeName: concreteTypes.name,
      concreteTypePrice: concreteTypes.pricePerM3,
    })
      .from(pouringItems)
      .leftJoin(concreteTypes, eq(pouringItems.concreteTypeId, concreteTypes.id))
      .where(inArray(pouringItems.pouringId, pouringIds))
      .orderBy(asc(pouringItems.sortOrder))
      .all();

    const itemsMap: Record<number, any[]> = {};
    for (const item of allItems) {
      if (!itemsMap[item.pouringId]) itemsMap[item.pouringId] = [];
      itemsMap[item.pouringId].push(item);
    }
    for (const p of result) {
      (p as any).items = itemsMap[p.id] || [];
      const its = itemsMap[p.id] || [];
      (p as any).quantityM3 = its.reduce((s: number, i: any) => s + (i.quantityM3 || 0), 0);
      (p as any).total = its.reduce((s: number, i: any) => s + (i.total || 0), 0);
    }
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { siteId, offerId, date, machineId, weather, notes, items } = body;

  if (!siteId || !date || !items || items.length === 0) {
    return NextResponse.json({ error: "Обект, дата и поне един ред са задължителни" }, { status: 400 });
  }

  const totalQty = items.reduce((s: number, i: any) => s + (parseFloat(i.quantityM3) || 0), 0);

  const pouring = db.transaction((tx) => {
    const p = tx.insert(pourings).values({
      siteId: parseInt(siteId),
      offerId: offerId ? parseInt(offerId) : null,
      date,
      concreteTypeId: items[0].concreteTypeId ? parseInt(items[0].concreteTypeId) : null,
      quantityM3: totalQty,
      machineId: machineId ? parseInt(machineId) : null,
      weather: weather || null,
      notes: notes || null,
      status: "completed",
    }).returning().get();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const qty = parseFloat(item.quantityM3) || 0;
      const price = parseFloat(item.pricePerM3) || 0;
      tx.insert(pouringItems).values({
        pouringId: p.id,
        concreteTypeId: item.concreteTypeId ? parseInt(item.concreteTypeId) : null,
        quantityM3: qty,
        pricePerM3: price,
        total: qty * price,
        sortOrder: i,
      });
    }

    return p;
  });

  return NextResponse.json(pouring, { status: 201 });
}
