import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { machines } from "@/db/schema";
import { auditLog } from "@/lib/audit";
import { firstZodError } from "@/lib/acts";
import { machineSchema } from "@/lib/machines";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const rows = db.select().from(machines).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = machineSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });

  const result = db.insert(machines).values({
    ...parsed.data,
    mileage: parsed.data.mileage ?? 0,
    status: "available",
  }).returning().get();

  auditLog({ action: "CREATE", entityType: "machines", entityId: result.id, changes: body });
  return NextResponse.json(result, { status: 201 });
}
