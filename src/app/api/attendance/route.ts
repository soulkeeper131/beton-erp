import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { workerAttendance, workers, sites } from "@/db/schema";
import { eq, desc, like, and, sql } from "drizzle-orm";
import { attendanceSchema } from "@/lib/payroll";
import { firstZodError } from "@/lib/acts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const workerId = searchParams.get("workerId");

  const conditions: any[] = [];
  if (month) conditions.push(like(workerAttendance.date, `${month}%`));
  if (workerId) conditions.push(eq(workerAttendance.workerId, parseInt(workerId)));

  const result = db
    .select({
      id: workerAttendance.id,
      workerId: workerAttendance.workerId,
      date: workerAttendance.date,
      siteId: workerAttendance.siteId,
      hours: workerAttendance.hours,
      overtime: workerAttendance.overtime,
      advance: workerAttendance.advance,
      notes: workerAttendance.notes,
      workerName: workers.name,
      // Ставките към деня на явката (стари записи без тях — текущите на работника)
      dailyRate: sql<number>`coalesce(${workerAttendance.dailyRate}, ${workers.dailyRate})`,
      overtimeRate: sql<number | null>`coalesce(${workerAttendance.overtimeRate}, ${workers.overtimeRate})`,
      siteName: sites.name,
    })
    .from(workerAttendance)
    .leftJoin(workers, eq(workerAttendance.workerId, workers.id))
    .leftJoin(sites, eq(workerAttendance.siteId, sites.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(workerAttendance.date))
    .all();

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = attendanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });

  const worker = db.select({ id: workers.id, dailyRate: workers.dailyRate, overtimeRate: workers.overtimeRate }).from(workers).where(eq(workers.id, parsed.data.workerId)).get();
  if (!worker) {
    return NextResponse.json({ error: "Работникът не съществува" }, { status: 400 });
  }
  if (parsed.data.siteId && !db.select({ id: sites.id }).from(sites).where(eq(sites.id, parsed.data.siteId)).get()) {
    return NextResponse.json({ error: "Обектът не съществува" }, { status: 400 });
  }

  // Един запис на работник за ден — иначе заплатата се удвоява
  const dup = db.select({ id: workerAttendance.id }).from(workerAttendance)
    .where(and(eq(workerAttendance.workerId, parsed.data.workerId), eq(workerAttendance.date, parsed.data.date)))
    .get();
  if (dup) {
    return NextResponse.json({ error: "Работникът вече има явка за тази дата — редактирайте съществуващата" }, { status: 409 });
  }

  const [created] = db
    .insert(workerAttendance)
    .values({
      workerId: parsed.data.workerId,
      date: parsed.data.date,
      siteId: parsed.data.siteId || null,
      hours: parsed.data.hours,
      overtime: parsed.data.overtime,
      advance: parsed.data.advance,
      notes: parsed.data.notes || null,
      dailyRate: worker.dailyRate,
      overtimeRate: worker.overtimeRate,
    })
    .returning()
    .all();

  return NextResponse.json(created, { status: 201 });
}
