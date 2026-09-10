import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { workerAttendance } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  const body = await req.json();
  const update: Record<string, any> = {};
  for (const key of ["workerId", "date", "siteId", "hours", "overtime", "advance", "notes"]) {
    if (body[key] !== undefined) update[key] = body[key];
  }

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
