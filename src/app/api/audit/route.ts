import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await db.select().from(auditLog).orderBy(desc(auditLog.timestamp)).limit(100);
  return NextResponse.json(result);
}
