import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { workers } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const result = await db.select().from(workers).orderBy(workers.name);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const body = await request.json();
  const { name, phone, dailyRate, overtimeRate, hireDate, notes } = body;

  if (!name || !dailyRate) {
    return NextResponse.json({ error: "Име и дневна ставка са задължителни" }, { status: 400 });
  }

  const result = await db.insert(workers).values({
    name,
    phone: phone || null,
    dailyRate,
    overtimeRate: overtimeRate || null,
    hireDate: hireDate || null,
    notes: notes || null,
    status: "active",
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
