import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { workerAttendance, workers } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { attendanceSchema } from "@/lib/payroll";
import { firstZodError } from "@/lib/acts";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  const current = db.select().from(workerAttendance).where(eq(workerAttendance.id, id)).get();
  if (!current) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });

  const parsed = attendanceSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  const update: Record<string, any> = {};
  for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) update[k] = v;

  if (update.workerId && update.workerId !== current.workerId) {
    const w = db.select({ dailyRate: workers.dailyRate, overtimeRate: workers.overtimeRate }).from(workers).where(eq(workers.id, update.workerId)).get();
    if (!w) return NextResponse.json({ error: "Работникът не съществува" }, { status: 400 });
    // Друг работник → неговите ставки
    update.dailyRate = w.dailyRate;
    update.overtimeRate = w.overtimeRate;
  }
  const workerId = update.workerId ?? current.workerId;
  const date = update.date ?? current.date;
  const dup = db.select({ id: workerAttendance.id }).from(workerAttendance)
    .where(and(eq(workerAttendance.workerId, workerId), eq(workerAttendance.date, date), ne(workerAttendance.id, id)))
    .get();
  if (dup) return NextResponse.json({ error: "Работникът вече има явка за тази дата" }, { status: 409 });

  const [updated] = db.update(workerAttendance).set(update).where(eq(workerAttendance.id, id)).returning().all();
  if (!updated) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  db.delete(workerAttendance).where(eq(workerAttendance.id, id)).run();
  return NextResponse.json({ message: "Изтрито" });
}
