import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pourings, sites, concreteTypes, machines } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");

  const result = await db.select({
    id: pourings.id,
    date: pourings.date,
    quantityM3: pourings.quantityM3,
    status: pourings.status,
    weather: pourings.weather,
    notes: pourings.notes,
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
    .where(siteId ? eq(pourings.siteId, parseInt(siteId)) : undefined)
    .orderBy(desc(pourings.date));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { siteId, date, concreteTypeId, quantityM3, machineId, weather, notes } = body;

  if (!siteId || !date || !concreteTypeId || !quantityM3) {
    return NextResponse.json({ error: "Обект, дата, тип бетон и количество са задължителни" }, { status: 400 });
  }

  const result = await db.insert(pourings).values({
    siteId,
    date,
    concreteTypeId,
    quantityM3,
    machineId: machineId || null,
    weather: weather || null,
    notes: notes || null,
    status: "completed",
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
