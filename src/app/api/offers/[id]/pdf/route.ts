import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { offers, offerItems, clients, concreteTypes, services, companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { renderToStream } from "@react-pdf/renderer";
import { OfferPDF } from "@/components/pdf/offer-pdf";

export const dynamic = "force-dynamic";

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
      quantityM3: offerItems.quantityM3,
      pricePerM3: offerItems.pricePerM3,
      transportCost: offerItems.transportCost,
      pumpCost: offerItems.pumpCost,
      total: offerItems.total,
      concreteTypeName: concreteTypes.name,
      concreteTypeClassName: concreteTypes.className,
      serviceName: services.name,
    })
    .from(offerItems)
    .leftJoin(concreteTypes, eq(offerItems.concreteTypeId, concreteTypes.id))
    .leftJoin(services, eq(offerItems.serviceId, services.id))
    .where(eq(offerItems.offerId, offerId))
    .all();

  const company = db.select().from(companySettings).get() || {};

  const stream = await renderToStream(
    OfferPDF({ offer, items, company })
  );

  // ASCII-safe filename — Cyrillic chars in headers cause ByteString error
  const safeNumber = offer.number?.replace(/[^a-zA-Z0-9_-]/g, "_") || "offer";
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeNumber}.pdf"`,
    },
  });
}
