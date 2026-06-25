import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { materials } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  const body = await request.json();
  const result = await db.update(materials).set(body).where(eq(materials.id, id)).returning();
  return NextResponse.json(result[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  await db.delete(materials).where(eq(materials.id, id));
  return NextResponse.json({ message: "Изтрито" });
}
