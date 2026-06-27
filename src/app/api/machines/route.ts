import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { machines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const rows = db.select().from(machines).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = db.insert(machines).values({
    name: body.name,
    type: body.type,
    category: body.category || "other",
    plateNumber: body.plateNumber,
    fuelType: body.fuelType,
    year: body.year,
    vin: body.vin,
    mileage: body.mileage || 0,
    vignetteExpiry: body.vignetteExpiry,
    insuranceExpiry: body.insuranceExpiry,
    techInspectionExpiry: body.techInspectionExpiry,
    status: "available",
    location: body.location,
    notes: body.notes,
  }).returning().get();

  auditLog({ action: "CREATE", entityType: "machines", entityId: result.id, changes: body });
  return NextResponse.json(result, { status: 201 });
}
