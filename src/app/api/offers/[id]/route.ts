import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { offers, offerItems, clients, concreteTypes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  siteId: z.coerce.number().int().optional().nullable(),
  date: z.string().optional(),
  validUntil: z.string().optional().nullable(),
  total: z.number().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
  notes: z.string().optional().nullable(),
  pdfPath: z.string().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offerId = parseInt(params.id);

  const offer = db
    .select({
      id: offers.id,
      number: offers.number,
      date: offers.date,
      validUntil: offers.validUntil,
      total: offers.total,
      status: offers.status,
      notes: offers.notes,
      pdfPath: offers.pdfPath,
      clientId: offers.clientId,
      siteId: offers.siteId,
      clientName: clients.name,
      clientCompany: clients.companyName,
      clientEik: clients.eik,
      clientVatNumber: clients.vatNumber,
      clientAddress: clients.address,
      clientPhone: clients.phone,
      clientEmail: clients.email,
    })
    .from(offers)
    .leftJoin(clients, eq(offers.clientId, clients.id))
    .where(eq(offers.id, offerId))
    .get();

  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = db
    .select({
      id: offerItems.id,
      offerId: offerItems.offerId,
      concreteTypeId: offerItems.concreteTypeId,
      quantityM3: offerItems.quantityM3,
      pricePerM3: offerItems.pricePerM3,
      transportCost: offerItems.transportCost,
      pumpCost: offerItems.pumpCost,
      total: offerItems.total,
      concreteTypeName: concreteTypes.name,
      concreteTypeClassName: concreteTypes.className,
    })
    .from(offerItems)
    .leftJoin(concreteTypes, eq(offerItems.concreteTypeId, concreteTypes.id))
    .where(eq(offerItems.offerId, offerId))
    .all();

  return NextResponse.json({ ...offer, items });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const offerId = parseInt(params.id);

  const existing = db
    .select()
    .from(offers)
    .where(eq(offers.id, offerId))
    .get();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, any> = {};
  if (parsed.data.clientId !== undefined) updateData.clientId = parsed.data.clientId;
  if (parsed.data.siteId !== undefined) updateData.siteId = parsed.data.siteId;
  if (parsed.data.date !== undefined) updateData.date = parsed.data.date;
  if (parsed.data.validUntil !== undefined) updateData.validUntil = parsed.data.validUntil;
  if (parsed.data.total !== undefined) updateData.total = parsed.data.total;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.pdfPath !== undefined) updateData.pdfPath = parsed.data.pdfPath;

  const [updated] = db
    .update(offers)
    .set(updateData)
    .where(eq(offers.id, offerId))
    .returning()
    .all();

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offerId = parseInt(params.id);

  const existing = db
    .select()
    .from(offers)
    .where(eq(offers.id, offerId))
    .get();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cascade delete items first
  db.delete(offerItems).where(eq(offerItems.offerId, offerId)).run();
  db.delete(offers).where(eq(offers.id, offerId)).run();

  return NextResponse.json({ success: true });
}
