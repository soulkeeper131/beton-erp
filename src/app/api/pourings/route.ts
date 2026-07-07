import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pourings, pouringItems, sites, concreteTypes, machines } from "@/db/schema";
import { eq, desc, asc, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");

  const result = await db.select({
    id: pourings.id,
    date: pourings.date,
    status: pourings.status,
    weather: pourings.weather,
    notes: pourings.notes,
    siteId: pourings.siteId,
    machineId: pourings.machineId,
    site: { id: sites.id, name: sites.name },
    machine: { id: machines.id, name: machines.name },
  })
    .from(pourings)
    .leftJoin(sites, eq(pourings.siteId, sites.id))
    .leftJoin(machines, eq(pourings.machineId, machines.id))
    .where(siteId ? eq(pourings.siteId, parseInt(siteId)) : undefined)
    .orderBy(desc(pourings.date));

  // Attach items to each pouring
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

    // Group by pouringId
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
  const body = await request.json();
  const { siteId, date, machineId, weather, notes, items } = body;

  if (!siteId || !date || !items || items.length === 0) {
    return NextResponse.json({ error: "Обект, дата и поне един ред са задължителни" }, { status: 400 });
  }

  const totalQty = items.reduce((s: number, i: any) => s + (parseFloat(i.quantityM3) || 0), 0);

  const result = await db.insert(pourings).values({
    siteId: parseInt(siteId),
    date,
    concreteTypeId: items[0].concreteTypeId ? parseInt(items[0].concreteTypeId) : null,
    quantityM3: totalQty,
    machineId: machineId ? parseInt(machineId) : null,
    weather: weather || null,
    notes: notes || null,
    status: "completed",
  }).returning();

  const pouring = result[0];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qty = parseFloat(item.quantityM3) || 0;
    const price = parseFloat(item.pricePerM3) || 0;
    await db.insert(pouringItems).values({
      pouringId: pouring.id,
      concreteTypeId: item.concreteTypeId ? parseInt(item.concreteTypeId) : null,
      quantityM3: qty,
      pricePerM3: price,
      total: qty * price,
      sortOrder: i,
    });
  }

  return NextResponse.json(pouring, { status: 201 });
}
