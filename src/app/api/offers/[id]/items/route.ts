import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { offers, offerItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { firstZodError } from "@/lib/acts";
import { offerItemSchema, offerItemTotal, recalcOfferTotal } from "@/lib/offers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateItemSchema = z.object({
  concreteTypeId: z.coerce.number().int().positive().optional().nullable(),
  serviceId: z.coerce.number().int().positive().optional().nullable(),
  quantityM3: z.coerce.number().positive().optional(),
  pricePerM3: z.coerce.number().min(0).optional(),
  transportCost: z.coerce.number().min(0).optional(),
  pumpCost: z.coerce.number().min(0).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offerId = parseInt(params.id);
  const body = await req.json();
  const parsed = offerItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  if (!db.select({ id: offers.id }).from(offers).where(eq(offers.id, offerId)).get()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const created = db.transaction((tx) => {
    const [row] = tx
      .insert(offerItems)
      .values({
        offerId,
        concreteTypeId: parsed.data.concreteTypeId || null,
        serviceId: parsed.data.serviceId || null,
        quantityM3: parsed.data.quantityM3,
        pricePerM3: parsed.data.pricePerM3,
        transportCost: parsed.data.transportCost,
        pumpCost: parsed.data.pumpCost,
        total: offerItemTotal(parsed.data),
      })
      .returning()
      .all();
    recalcOfferTotal(tx, offerId);
    return row;
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offerId = parseInt(params.id);
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  const item = db
    .select()
    .from(offerItems)
    .where(eq(offerItems.id, parseInt(itemId)))
    .get();

  // Редът трябва да е от тази оферта
  if (!item || item.offerId !== offerId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const quantityM3 = parsed.data.quantityM3 ?? item.quantityM3;
  const pricePerM3 = parsed.data.pricePerM3 ?? item.pricePerM3;
  const transportCost = parsed.data.transportCost ?? item.transportCost ?? 0;
  const pumpCost = parsed.data.pumpCost ?? item.pumpCost ?? 0;
  const total = offerItemTotal({ quantityM3, pricePerM3, transportCost, pumpCost });

  const updateData: Record<string, any> = {};
  if (parsed.data.concreteTypeId !== undefined) updateData.concreteTypeId = parsed.data.concreteTypeId;
  if (parsed.data.serviceId !== undefined) updateData.serviceId = parsed.data.serviceId;
  if (parsed.data.quantityM3 !== undefined) updateData.quantityM3 = parsed.data.quantityM3;
  if (parsed.data.pricePerM3 !== undefined) updateData.pricePerM3 = parsed.data.pricePerM3;
  if (parsed.data.transportCost !== undefined) updateData.transportCost = parsed.data.transportCost;
  if (parsed.data.pumpCost !== undefined) updateData.pumpCost = parsed.data.pumpCost;
  updateData.total = total;

  const updated = db.transaction((tx) => {
    const [row] = tx.update(offerItems).set(updateData).where(eq(offerItems.id, item.id)).returning().all();
    recalcOfferTotal(tx, offerId);
    return row;
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  if (!item || item.offerId !== offerId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.transaction((tx) => {
    tx.delete(offerItems).where(eq(offerItems.id, item.id)).run();
    recalcOfferTotal(tx, offerId);
  });

  return NextResponse.json({ success: true });
}
