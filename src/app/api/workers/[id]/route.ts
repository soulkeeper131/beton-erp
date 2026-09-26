import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { workers, workerAttendance, actWorkers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { workerSchema } from "@/lib/payroll";
import { firstZodError } from "@/lib/acts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  const result = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
  if (!result.length) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  const parsed = workerSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  const update: Record<string, any> = { updatedAt: new Date().toISOString() };
  for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) update[k] = v;
  const result = await db.update(workers).set(update).where(eq(workers.id, id)).returning();
  if (!result.length) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  // Работник с явки или в актове не се трие — изтриването махаше труда му от
  // старите актове и ведомостите. Маркира се като неактивен.
  const inActs = db.select({ id: actWorkers.id }).from(actWorkers).where(eq(actWorkers.workerId, id)).limit(1).get();
  const inAttendance = db.select({ id: workerAttendance.id }).from(workerAttendance).where(eq(workerAttendance.workerId, id)).limit(1).get();
  if (inActs || inAttendance) {
    return NextResponse.json({ error: "Работникът има явки или участва в актове — маркирайте го като неактивен вместо да го триете" }, { status: 409 });
  }
  db.delete(workers).where(eq(workers.id, id)).run();
  return NextResponse.json({ message: "Изтрито" });
}
