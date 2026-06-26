import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { serviceItems, concreteTypes, materials } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const serviceId = parseInt(params.id);
  const result = await db.select({
    id: serviceItems.id, serviceId: serviceItems.serviceId,
    concreteTypeId: serviceItems.concreteTypeId, materialId: serviceItems.materialId,
    actionName: serviceItems.actionName, quantity: serviceItems.quantity,
    unit: serviceItems.unit, pricePerUnit: serviceItems.pricePerUnit, sortOrder: serviceItems.sortOrder,
    concreteType: { id: concreteTypes.id, name: concreteTypes.name },
    material: { id: materials.id, name: materials.name },
  })
    .from(serviceItems)
    .leftJoin(concreteTypes, eq(serviceItems.concreteTypeId, concreteTypes.id))
    .leftJoin(materials, eq(serviceItems.materialId, materials.id))
    .where(eq(serviceItems.serviceId, serviceId))
    .orderBy(serviceItems.sortOrder);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const serviceId = parseInt(params.id);
  const body = await request.json();
  const { concreteTypeId, materialId, actionName, quantity, unit, pricePerUnit, sortOrder } = body;
  const result = await db.insert(serviceItems).values({
    serviceId,
    concreteTypeId: concreteTypeId || null,
    materialId: materialId || null,
    actionName: actionName || null,
    quantity: quantity || 1,
    unit: unit || "бр.",
    pricePerUnit: pricePerUnit || 0,
    sortOrder: sortOrder || 0,
  }).returning();
  return NextResponse.json(result[0], { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  await db.delete(serviceItems).where(eq(serviceItems.id, parseInt(itemId)));
  return NextResponse.json({ success: true });
}
