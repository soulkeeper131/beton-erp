import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  const result = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
  if (!result.length) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  const body = await request.json();
  const allowed = ["name", "phone", "dailyRate", "overtimeRate", "status", "hireDate", "notes"];
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  const result = await db.update(workers).set(update).where(eq(workers.id, id)).returning();
  if (!result.length) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  await db.delete(workers).where(eq(workers.id, id));
  return NextResponse.json({ message: "Изтрито" });
}
