import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pourings, sites, concreteTypes, machines } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  const result = await db.select({
    id: pourings.id,
    date: pourings.date,
    quantityM3: pourings.quantityM3,
    status: pourings.status,
    weather: pourings.weather,
    notes: pourings.notes,
    actPdfPath: pourings.actPdfPath,
    siteId: pourings.siteId,
    concreteTypeId: pourings.concreteTypeId,
    machineId: pourings.machineId,
    site: { id: sites.id, name: sites.name },
    concreteType: { id: concreteTypes.id, name: concreteTypes.name, pricePerM3: concreteTypes.pricePerM3 },
    machine: { id: machines.id, name: machines.name },
  })
    .from(pourings)
    .leftJoin(sites, eq(pourings.siteId, sites.id))
    .leftJoin(concreteTypes, eq(pourings.concreteTypeId, concreteTypes.id))
    .leftJoin(machines, eq(pourings.machineId, machines.id))
    .where(eq(pourings.id, id))
    .limit(1);

  if (!result.length) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });

  return NextResponse.json(result[0]);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  const body = await request.json();
  const allowed = ["siteId", "date", "concreteTypeId", "quantityM3", "machineId", "weather", "notes", "status"];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const result = await db.update(pourings).set(update).where(eq(pourings.id, id)).returning();
  if (!result.length) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });

  return NextResponse.json(result[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  await db.delete(pourings).where(eq(pourings.id, id));
  return NextResponse.json({ message: "Изтрито" });
}
