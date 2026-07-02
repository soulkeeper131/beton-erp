import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { invoices, invoiceItems, clients, companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { renderToStream } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/pdf/invoice-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoiceId = parseInt(params.id);

  const invoice = db
    .select({
      id: invoices.id,
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
      taxExemptionReason: invoices.taxExemptionReason,
      notes: invoices.notes,
      clientName: clients.name,
      clientCompany: clients.companyName,
      clientEik: clients.eik,
      clientVatNumber: clients.vatNumber,
      clientAddress: clients.address,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.id, invoiceId))
    .get();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const company = db.select().from(companySettings).get() || {};
  const items = db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).all();

  const stream = await renderToStream(
    InvoicePDF({ invoice, items, company })
  );

  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoice.number}.pdf"`,
    },
  });
}
