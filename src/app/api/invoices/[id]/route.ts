import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { invoices, invoiceItems, clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = db
    .select({
      id: invoices.id,
      clientId: invoices.clientId,
      supplierId: invoices.supplierId,
      number: invoices.number,
      date: invoices.date,
      dueDate: invoices.dueDate,
      taxEventDate: invoices.taxEventDate,
      direction: invoices.direction,
      type: invoices.type,
      currency: invoices.currency,
      subtotal: invoices.subtotal,
      discountPercent: invoices.discountPercent,
      discountAmount: invoices.discountAmount,
      vatRate: invoices.vatRate,
      vatAmount: invoices.vatAmount,
      total: invoices.total,
      paymentMethod: invoices.paymentMethod,
      paymentStatus: invoices.paymentStatus,
      relatedInvoiceId: invoices.relatedInvoiceId,
      taxExemptionReason: invoices.taxExemptionReason,
      status: invoices.status,
      notes: invoices.notes,
      pdfPath: invoices.pdfPath,
      createdAt: invoices.createdAt,
      clientName: clients.name,
      clientCompany: clients.companyName,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.id, parseInt(params.id)))
    .get();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, parseInt(params.id))).all();

  return NextResponse.json({ ...invoice, items });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updated = db.update(invoices).set(body).where(eq(invoices.id, parseInt(params.id))).returning().get();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, parseInt(params.id))).run();
  db.delete(invoices).where(eq(invoices.id, parseInt(params.id))).run();
  return NextResponse.json({ success: true });
}
