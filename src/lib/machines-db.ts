import { db } from "@/db";
import { machines, machineMaintenance } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// След промяна в ремонтите: последно обслужване = най-новият ремонт; следващо =
// неговата „следваща дата“ (ако е зададена); километражът не намалява.
export function syncMachineAfterRepairs(tx: Tx, machineId: number) {
  const latest = tx
    .select()
    .from(machineMaintenance)
    .where(eq(machineMaintenance.machineId, machineId))
    .orderBy(desc(machineMaintenance.date), desc(machineMaintenance.id))
    .limit(1)
    .get();
  const machine = tx.select({ mileage: machines.mileage }).from(machines).where(eq(machines.id, machineId)).get();
  if (!machine) return;

  const maxRepairKm = tx
    .select({ km: machineMaintenance.mileageAtRepair })
    .from(machineMaintenance)
    .where(eq(machineMaintenance.machineId, machineId))
    .all()
    .reduce((m, r) => Math.max(m, r.km || 0), 0);

  tx.update(machines)
    .set({
      lastMaintenanceDate: latest?.date ?? null,
      ...(latest?.nextDate ? { nextMaintenanceDate: latest.nextDate } : {}),
      mileage: Math.max(machine.mileage || 0, maxRepairKm),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(machines.id, machineId))
    .run();
}
