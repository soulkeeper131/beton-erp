import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { workers } from "@/db/schema";
import { workerSchema } from "@/lib/payroll";
import { firstZodError } from "@/lib/acts";

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

  const parsed = workerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });

  const result = await db.insert(workers).values({ ...parsed.data, status: "active" }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
