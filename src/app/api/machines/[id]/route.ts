import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { machines, machineMaintenance, pourings, siteCalendar, serviceItems } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { auditLog } from "@/lib/audit";
import { firstZodError } from "@/lib/acts";
import { machinePatchSchema } from "@/lib/machines";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const machine = db.select().from(machines).where(eq(machines.id, parseInt(params.id))).get();
  if (!machine) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const repairs = db.select().from(machineMaintenance)
    .where(eq(machineMaintenance.machineId, parseInt(params.id)))
    .orderBy(desc(machineMaintenance.date)).all();

  return NextResponse.json({ ...machine, repairs });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const id = parseInt(params.id);
  const parsed = machinePatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });

  const updated = db.update(machines)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(machines.id, id)).returning().get();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  auditLog({ action: "UPDATE", entityType: "machines", entityId: id, changes: body });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const id = parseInt(params.id);
  // Машина, ползвана в актове/календар/услуги, не се трие — иначе FK грешка след като
  // историята на ремонтите вече е изтрита. Може да се маркира като неактивна.
  const refs = [
    db.select({ id: pourings.id }).from(pourings).where(eq(pourings.machineId, id)).limit(1).get() && "актове",
    db.select({ id: siteCalendar.id }).from(siteCalendar).where(eq(siteCalendar.machineId, id)).limit(1).get() && "календара",
    db.select({ id: serviceItems.id }).from(serviceItems).where(eq(serviceItems.machineId, id)).limit(1).get() && "услуги",
  ].filter(Boolean);
  if (refs.length) {
    return NextResponse.json({ error: `Машината се ползва в ${refs.join(", ")} и не може да се изтрие. Сменете статуса ѝ.` }, { status: 409 });
  }

  db.transaction((tx) => {
    tx.delete(machineMaintenance).where(eq(machineMaintenance.machineId, id)).run();
    tx.delete(machines).where(eq(machines.id, id)).run();
  });
  auditLog({ action: "DELETE", entityType: "machines", entityId: id });
  return NextResponse.json({ success: true });
}
