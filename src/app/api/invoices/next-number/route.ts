import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const direction = searchParams.get("direction") || "outgoing";

  const result = db.select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(eq(invoices.direction, direction))
    .get();
  const count = result?.count || 0;
  const prefix = direction === "incoming" ? "ВХ-" : "ИЗХ-";
  const number = `${prefix}${String(count + 1).padStart(6, "0")}`;

  return NextResponse.json({ number });
}
