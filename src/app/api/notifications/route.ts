import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

// Списък на нотификации (по подразбиране — всички, най-новите първи)
export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth.session && !auth.isApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const rows = await db
    .select()
    .from(schema.notifications)
    .where(unreadOnly ? eq(schema.notifications.isRead, false) : undefined)
    .orderBy(desc(schema.notifications.createdAt))
    .limit(limit)
    .all();

  return NextResponse.json(rows);
}
