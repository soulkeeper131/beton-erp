import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { offers, offerItems, clients, sites } from "@/db/schema";
import { eq, desc, and, sql, like } from "drizzle-orm";
import { z } from "zod";

const offerSchema = z.object({
  clientId: z.coerce.number().int().positive("Изберете клиент"),
  siteId: z.coerce.number().int().optional().nullable(),
  date: z.string().min(1, "Датата е задължителна"),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";

  let whereClause;
  if (status && status !== "all") {
    whereClause = eq(offers.status, status);
  }

  const result = db
    .select({
      id: offers.id,
      number: offers.number,
      date: offers.date,
      validUntil: offers.validUntil,
      total: offers.total,
      status: offers.status,
      notes: offers.notes,
      clientId: offers.clientId,
      siteId: offers.siteId,
      clientName: clients.name,
      clientCompany: clients.companyName,
    })
    .from(offers)
    .leftJoin(clients, eq(offers.clientId, clients.id))
    .orderBy(desc(offers.date))
    .$dynamic();

  if (whereClause) {
    result.where(whereClause);
  }

  const data = result.all();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Auto-generate offer number
  const currentYear = new Date().getFullYear();
  const prefix = `ОФ-${currentYear}-`;

  // Count existing offers for this year
  const existing = db
    .select({ count: sql<number>`count(*)` })
    .from(offers)
    .where(like(offers.number, `${prefix}%`))
    .get();

  const count = existing?.count ?? 0;
  const number = generateNumber("ОФ", count);

  const [created] = db
    .insert(offers)
    .values({
      clientId: parsed.data.clientId,
      siteId: parsed.data.siteId ?? null,
      number,
      date: parsed.data.date,
      validUntil: parsed.data.validUntil ?? null,
      notes: parsed.data.notes ?? null,
      total: 0,
      status: "draft",
    })
    .returning()
    .all();

  return NextResponse.json(created, { status: 201 });
}

function generateNumber(prefix: string, count: number): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}
