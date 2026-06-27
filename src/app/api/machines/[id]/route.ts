import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { machines, machineMaintenance } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auditLog } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const machine = db.select().from(machines).where(eq(machines.id, parseInt(params.id))).get();
  if (!machine) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repairs = db.select().from(machineMaintenance)
    .where(eq(machineMaintenance.machineId, parseInt(params.id)))
    .orderBy(machineMaintenance.date).all();

  return NextResponse.json({ ...machine, repairs });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const id = parseInt(params.id);

  const updated = db.update(machines).set({
    name: body.name, type: body.type, category: body.category,
    plateNumber: body.plateNumber, fuelType: body.fuelType,
    year: body.year, vin: body.vin, mileage: body.mileage,
    vignetteExpiry: body.vignetteExpiry,
    insuranceExpiry: body.insuranceExpiry,
    techInspectionExpiry: body.techInspectionExpiry,
    status: body.status, location: body.location,
    lastMaintenanceDate: body.lastMaintenanceDate,
    nextMaintenanceDate: body.nextMaintenanceDate,
    notes: body.notes,
  }).where(eq(machines.id, id)).returning().get();

  auditLog({ action: "UPDATE", entityType: "machines", entityId: id, changes: body });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  db.delete(machines).where(eq(machines.id, id)).run();
  db.delete(machineMaintenance).where(eq(machineMaintenance.machineId, id)).run();
  auditLog({ action: "DELETE", entityType: "machines", entityId: id });
  return NextResponse.json({ success: true });
}
