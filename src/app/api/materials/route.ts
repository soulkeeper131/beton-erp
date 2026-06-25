import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { materials } from "@/db/schema";

export async function GET() {
  const result = await db.select().from(materials).orderBy(materials.name);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, unit, quantity, minThreshold, pricePerUnit, notes } = body;
  if (!name || !unit) return NextResponse.json({ error: "Име и мерна единица са задължителни" }, { status: 400 });

  const result = await db.insert(materials).values({
    name, unit,
    quantity: quantity || 0,
    minThreshold: minThreshold || 0,
    pricePerUnit: pricePerUnit || null,
    notes: notes || null,
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
