import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { offers, offerItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const itemSchema = z.object({
  concreteTypeId: z.coerce.number().int().positive().optional().nullable(),
  serviceId: z.coerce.number().int().positive().optional().nullable(),
  quantityM3: z.coerce.number().positive("Количеството трябва да е положително"),
  pricePerM3: z.coerce.number().min(0, "Цената не може да е отрицателна"),
  transportCost: z.coerce.number().min(0).optional().default(0),
  pumpCost: z.coerce.number().min(0).optional().default(0),
}).refine(data => data.concreteTypeId || data.serviceId, {
  message: "Изберете тип бетон или услуга",
  path: ["concreteTypeId"],
});

const updateItemSchema = z.object({
  concreteTypeId: z.coerce.number().int().positive().optional().nullable(),
  serviceId: z.coerce.number().int().positive().optional().nullable(),
  quantityM3: z.coerce.number().positive().optional(),
  pricePerM3: z.coerce.number().min(0).optional(),
  transportCost: z.coerce.number().min(0).optional(),
  pumpCost: z.coerce.number().min(0).optional(),
});

function recalcOfferTotal(offerId: number) {
  const result = db
    .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
    .from(offerItems)
    .where(eq(offerItems.offerId, offerId))
    .get();

  const newTotal = result?.total ?? 0;
  db.update(offers)
    .set({ total: newTotal })
    .where(eq(offers.id, offerId))
    .run();
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offerId = parseInt(params.id);
  const body = await req.json();
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const total =
    parsed.data.quantityM3 * parsed.data.pricePerM3 +
    parsed.data.transportCost +
    parsed.data.pumpCost;

  const [created] = db
    .insert(offerItems)
    .values({
      offerId,
      concreteTypeId: parsed.data.concreteTypeId || null,
      serviceId: parsed.data.serviceId || null,
      quantityM3: parsed.data.quantityM3,
      pricePerM3: parsed.data.pricePerM3,
      transportCost: parsed.data.transportCost,
      pumpCost: parsed.data.pumpCost,
      total,
    })
    .returning()
    .all();

  recalcOfferTotal(offerId);

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offerId = parseInt(params.id);
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = db
    .select()
    .from(offerItems)
    .where(eq(offerItems.id, parseInt(itemId)))
    .get();

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const quantityM3 = parsed.data.quantityM3 ?? item.quantityM3;
  const pricePerM3 = parsed.data.pricePerM3 ?? item.pricePerM3;
  const transportCost = parsed.data.transportCost ?? item.transportCost ?? 0;
  const pumpCost = parsed.data.pumpCost ?? item.pumpCost ?? 0;
  const total = quantityM3 * pricePerM3 + transportCost + pumpCost;

  const updateData: Record<string, any> = {};
  if (parsed.data.concreteTypeId !== undefined) updateData.concreteTypeId = parsed.data.concreteTypeId;
  if (parsed.data.serviceId !== undefined) updateData.serviceId = parsed.data.serviceId;
  if (parsed.data.quantityM3 !== undefined) updateData.quantityM3 = parsed.data.quantityM3;
  if (parsed.data.pricePerM3 !== undefined) updateData.pricePerM3 = parsed.data.pricePerM3;
  if (parsed.data.transportCost !== undefined) updateData.transportCost = parsed.data.transportCost;
  if (parsed.data.pumpCost !== undefined) updateData.pumpCost = parsed.data.pumpCost;
  updateData.total = total;

  const [updated] = db
    .update(offerItems)
    .set(updateData)
    .where(eq(offerItems.id, parseInt(itemId)))
    .returning()
    .all();

  recalcOfferTotal(offerId);

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offerId = parseInt(params.id);
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const item = db
    .select()
    .from(offerItems)
    .where(eq(offerItems.id, parseInt(itemId)))
    .get();

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.delete(offerItems).where(eq(offerItems.id, parseInt(itemId))).run();

  recalcOfferTotal(offerId);

  return NextResponse.json({ success: true });
}
