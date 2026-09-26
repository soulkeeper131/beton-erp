import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { machineMaintenance } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { syncMachineAfterRepairs } from "@/lib/machines-db";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; repairId: string } }
) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const machineId = parseInt(params.id);
  const repairId = parseInt(params.repairId);

  db.transaction((tx) => {
    tx.delete(machineMaintenance)
      .where(and(eq(machineMaintenance.id, repairId), eq(machineMaintenance.machineId, machineId)))
      .run();
    syncMachineAfterRepairs(tx, machineId);
  });
  return NextResponse.json({ success: true });
}
