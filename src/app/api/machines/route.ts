import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { machines } from "@/db/schema";

export async function GET() {
  const result = await db.select().from(machines).orderBy(machines.name);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, type, plateNumber, fuelType, location, notes } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "Име и тип са задължителни" }, { status: 400 });
  }

  const result = await db.insert(machines).values({
    name,
    type,
    plateNumber: plateNumber || null,
    fuelType: fuelType || null,
    location: location || null,
    notes: notes || null,
    status: "available",
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
