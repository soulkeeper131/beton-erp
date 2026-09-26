import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { machines, machineMaintenance } from "@/db/schema";
import { eq } from "drizzle-orm";
import { firstZodError } from "@/lib/acts";
import { repairSchema } from "@/lib/machines";
import { syncMachineAfterRepairs } from "@/lib/machines-db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const machineId = parseInt(params.id);
  if (!db.select({ id: machines.id }).from(machines).where(eq(machines.id, machineId)).get()) {
    return NextResponse.json({ error: "Машината не е намерена" }, { status: 404 });
  }

  const parsed = repairSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  const r = parsed.data;

  const row = db.transaction((tx) => {
    const created = tx.insert(machineMaintenance).values({
      machineId,
      date: r.date,
      type: r.type,
      description: r.description,
      cost: r.cost,
      provider: r.provider,
      mileageAtRepair: r.mileageAtRepair || null,
      nextDate: r.nextDate,
      notes: r.notes,
    }).returning().get();
    syncMachineAfterRepairs(tx, machineId);
    return created;
  });

  return NextResponse.json(row, { status: 201 });
}
