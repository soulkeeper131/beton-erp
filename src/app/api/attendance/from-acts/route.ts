import { NextResponse } from "next/server";
import { and, eq, like } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { actWorkers, pourings, workerAttendance, workers } from "@/db/schema";
import { attendanceFromActs } from "@/lib/payroll";

export const dynamic = "force-dynamic";

// POST { month: "YYYY-MM" } — създава липсващите явки от работниците в актовете за месеца.
// Съществуваща явка (работник + ден) не се пипа — така ръчно въведеното има предимство.
export async function POST(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const month = String(body?.month || "");
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Изберете месец" }, { status: 400 });

  const rows = db.select({ workerId: actWorkers.workerId, date: pourings.date, siteId: pourings.siteId, hours: actWorkers.hours })
    .from(actWorkers).innerJoin(pourings, eq(actWorkers.pouringId, pourings.id))
    .where(like(pourings.date, `${month}%`)).all();
  const planned = attendanceFromActs(rows);

  let created = 0, skipped = 0;
  db.transaction((tx) => {
    for (const a of planned) {
      const exists = tx.select({ id: workerAttendance.id }).from(workerAttendance)
        .where(and(eq(workerAttendance.workerId, a.workerId), eq(workerAttendance.date, a.date))).get();
      if (exists) { skipped++; continue; }
      const w = tx.select({ dailyRate: workers.dailyRate, overtimeRate: workers.overtimeRate }).from(workers).where(eq(workers.id, a.workerId)).get();
      if (!w) { skipped++; continue; }
      tx.insert(workerAttendance).values({
        workerId: a.workerId, date: a.date, siteId: a.siteId, hours: a.hours, overtime: a.overtime, advance: 0,
        notes: "От акт", dailyRate: w.dailyRate, overtimeRate: w.overtimeRate,
      }).run();
      created++;
    }
  });
  return NextResponse.json({ created, skipped });
}
