import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth.session && !auth.isApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db
    .select({ cnt: count() })
    .from(schema.notifications)
    .where(eq(schema.notifications.isRead, false))
    .get();
  return NextResponse.json({ count: rows?.cnt || 0 });
}
