import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pourings, pouringItems, sites, concreteTypes, machines } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  const result = await db.select({
    id: pourings.id,
    date: pourings.date,
    status: pourings.status,
    weather: pourings.weather,
    notes: pourings.notes,
    actPdfPath: pourings.actPdfPath,
    siteId: pourings.siteId,
    machineId: pourings.machineId,
    site: { id: sites.id, name: sites.name },
    machine: { id: machines.id, name: machines.name },
  })
    .from(pourings)
    .leftJoin(sites, eq(pourings.siteId, sites.id))
    .leftJoin(machines, eq(pourings.machineId, machines.id))
    .where(eq(pourings.id, id))
    .limit(1);

  if (!result.length) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });

  const pouring = result[0] as any;

  // Load items
  const items = await db.select({
    id: pouringItems.id,
    concreteTypeId: pouringItems.concreteTypeId,
    quantityM3: pouringItems.quantityM3,
    pricePerM3: pouringItems.pricePerM3,
    total: pouringItems.total,
    concreteTypeName: concreteTypes.name,
    concreteTypePrice: concreteTypes.pricePerM3,
  })
    .from(pouringItems)
    .leftJoin(concreteTypes, eq(pouringItems.concreteTypeId, concreteTypes.id))
    .where(eq(pouringItems.pouringId, id))
    .orderBy(asc(pouringItems.sortOrder))
    .all();

  pouring.items = items;
  pouring.quantityM3 = items.reduce((s: number, i: any) => s + (i.quantityM3 || 0), 0);
  pouring.total = items.reduce((s: number, i: any) => s + (i.total || 0), 0);

  return NextResponse.json(pouring);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  const body = await request.json();

  // Update main fields
  const update: Record<string, any> = {};
  const mainFields = ["siteId", "date", "machineId", "weather", "notes", "status"];
  for (const key of mainFields) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  // If items provided, update items
  if (body.items && Array.isArray(body.items)) {
    // Delete existing items
    await db.delete(pouringItems).where(eq(pouringItems.pouringId, id));

    // Insert new items
    let totalQty = 0;
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      const qty = parseFloat(item.quantityM3) || 0;
      const price = parseFloat(item.pricePerM3) || 0;
      totalQty += qty;
      await db.insert(pouringItems).values({
        pouringId: id,
        concreteTypeId: item.concreteTypeId ? parseInt(item.concreteTypeId) : null,
        quantityM3: qty,
        pricePerM3: price,
        total: qty * price,
        sortOrder: i,
      });
    }

    update.quantityM3 = totalQty;
    update.concreteTypeId = body.items[0]?.concreteTypeId
      ? parseInt(body.items[0].concreteTypeId)
      : null;
  }

  if (Object.keys(update).length > 0) {
    const result = await db.update(pourings).set(update).where(eq(pourings.id, id)).returning();
    if (!result.length) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });
  }

  // Return updated pouring with items
  return GET(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  await db.delete(pouringItems).where(eq(pouringItems.pouringId, id));
  await db.delete(pourings).where(eq(pourings.id, id));
  return NextResponse.json({ message: "Изтрито" });
}
