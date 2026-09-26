import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { invoices, invoiceItems, clients, companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      clientName: clients.name,
      clientCompany: clients.companyName,
      clientEik: clients.eik,
      clientVatNumber: clients.vatNumber,
      clientAddress: clients.address,
      clientPhone: clients.phone,
      clientEmail: clients.email,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.id, parseInt(params.id)))
    .get();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const company = db.select().from(companySettings).get();
  const items = db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, parseInt(params.id))).all();

  return NextResponse.json({ ...invoice, items, company });
}

// Позволени промени: издаване (чернова → издадена), плащане и бележки.
// Сумите, редовете и номерът на издадена фактура не се пипат — корекция става с кредитно/дебитно известие.
const patchSchema = z
  .object({
    status: z.enum(["draft", "sent"]).optional(),
    paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
    paymentMethod: z.enum(["bank", "cash", "card"]).optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const current = db.select({ status: invoices.status }).from(invoices).where(eq(invoices.id, id)).get();
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Непозволена промяна", details: parsed.error.flatten() }, { status: 400 });
  }
  if (current.status === "sent" && parsed.data.status === "draft") {
    return NextResponse.json({ error: "Издадена фактура не може да се върне в чернова" }, { status: 409 });
  }

  const updated = db
    .update(invoices)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(invoices.id, id))
    .returning()
    .get();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const current = db.select({ status: invoices.status }).from(invoices).where(eq(invoices.id, id)).get();
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Издадена фактура не се трие (пропуск в номерацията) — анулира се с кредитно известие
  if (current.status !== "draft") {
    return NextResponse.json({ error: "Издадена фактура не може да се изтрие — издайте кредитно известие" }, { status: 409 });
  }

  db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id)).run();
  db.delete(invoices).where(eq(invoices.id, id)).run();
  return NextResponse.json({ success: true });
}
