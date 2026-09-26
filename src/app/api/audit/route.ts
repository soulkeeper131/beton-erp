import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const result = await db.select().from(auditLog).orderBy(desc(auditLog.timestamp)).limit(100);
  return NextResponse.json(result);
}
