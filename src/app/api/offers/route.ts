import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { offers, clients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { firstZodError } from "@/lib/acts";
import { getNextOfferNumber, offerItemSchema, replaceOfferItems } from "@/lib/offers";

export const dynamic = "force-dynamic";

const offerSchema = z.object({
  clientId: z.coerce.number().int().positive("Изберете клиент"),
  siteId: z.coerce.number().int().optional().nullable(),
  date: z.string().min(1, "Датата е задължителна"),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(offerItemSchema).optional(),
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
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  const created = db.transaction((tx) => {
    const [offer] = tx
      .insert(offers)
      .values({
        clientId: parsed.data.clientId,
        siteId: parsed.data.siteId ?? null,
        number: getNextOfferNumber(),
        date: parsed.data.date,
        validUntil: parsed.data.validUntil ?? null,
        notes: parsed.data.notes ?? null,
        total: 0,
        status: "draft",
      })
      .returning()
      .all();
    // Офертата и редовете ѝ се записват заедно — без полупразни оферти при грешка
    if (parsed.data.items?.length) replaceOfferItems(tx, offer.id, parsed.data.items);
    return tx.select().from(offers).where(eq(offers.id, offer.id)).get()!;
  });

  // Клиентът не се известява автоматично за чернова — офертата се изпраща ръчно
  // от страницата ѝ („Изпрати“, с PDF), когато е готова.
  return NextResponse.json(created, { status: 201 });
}
