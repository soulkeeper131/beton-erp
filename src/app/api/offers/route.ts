import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { offers, offerItems, clients, sites } from "@/db/schema";
import { eq, desc, like } from "drizzle-orm";
import { z } from "zod";
import { notifyOfferCreated } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const offerSchema = z.object({
  clientId: z.coerce.number().int().positive("Изберете клиент"),
  siteId: z.coerce.number().int().optional().nullable(),
  date: z.string().min(1, "Датата е задължителна"),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Auto-generate offer number (MAX + 1, за да няма колазии след изтриване)
  const currentYear = new Date().getFullYear();
  const prefix = `ОФ-${currentYear}-`;

  const last = db
    .select({ number: offers.number })
    .from(offers)
    .where(like(offers.number, `${prefix}%`))
    .orderBy(desc(offers.number))
    .limit(1)
    .get();

  let seq = 0;
  if (last?.number) {
    const m = last.number.match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10);
  }
  const number = `${prefix}${String(seq + 1).padStart(4, "0")}`;

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

  // Send email notification (fire-and-forget)
  try {
    const client = db.select({ email: clients.email, name: clients.name, companyName: clients.companyName })
      .from(clients).where(eq(clients.id, parsed.data.clientId)).get();
    if (client?.email) {
      let siteName: string | undefined;
      if (parsed.data.siteId) {
        const site = db.select({ name: sites.name }).from(sites).where(eq(sites.id, parsed.data.siteId)).get();
        siteName = site?.name;
      }
      notifyOfferCreated({
        number: created.number,
        clientEmail: client.email,
        clientName: client.companyName || client.name || "Клиент",
        siteName,
        total: created.total,
      }).catch(() => {});
    }
  } catch {}

  return NextResponse.json(created, { status: 201 });
}
