import { NextResponse } from "next/server";
import { adminGate, getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { concreteTypes } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const concreteTypeSchema = z.object({
  name: z.string({ required_error: "Името е задължително" }).trim().min(1, "Името е задължително"),
  className: z.string().optional().default(""),
  pricePerM3: z.coerce.number({ invalid_type_error: "Въведете цена" }).min(0, "Цената не може да е отрицателна"),
  description: z.string().optional().default(""),
});

export async function GET(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // По подразбиране само активните (изтритите не се предлагат в нови оферти/актове);
  // ?all=1 — и неактивните, за страниците, които показват стари записи.
  const all = new URL(req.url).searchParams.get("all") === "1";
  const types = await db
    .select()
    .from(concreteTypes)
    .where(all ? undefined : eq(concreteTypes.active, true))
    .orderBy(asc(concreteTypes.name))
    .all();

  return NextResponse.json(types);
}

export async function POST(req: Request) {
  // Цените влизат в офертите и актовете — променя ги администраторът
  const a = await adminGate(req, "Само администратор променя типовете бетон");
  if ("denied" in a) return a.denied;

  const body = await req.json().catch(() => null);
  const parsed = concreteTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Невалидни данни" }, { status: 400 });
  }

  const [created] = await db.insert(concreteTypes).values({
    name: parsed.data.name,
    className: parsed.data.className || null,
    pricePerM3: parsed.data.pricePerM3,
    description: parsed.data.description || null,
    active: true,
  }).returning().all();

  return NextResponse.json(created, { status: 201 });
}
