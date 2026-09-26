import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  // По подразбиране само активните; ?all=1 — всички (за стари оферти)
  const all = new URL(req.url).searchParams.get("all") === "1";
  const result = await db.select().from(services).where(all ? undefined : eq(services.active, true)).orderBy(services.name);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const body = await request.json();
  const { name, description, category, unit, basePrice } = body;
  if (!name) return NextResponse.json({ error: "Име е задължително" }, { status: 400 });

  const result = await db.insert(services).values({
    name,
    description: description || null,
    category: category || "other",
    unit: unit || "бр.",
    basePrice: basePrice || 0,
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
