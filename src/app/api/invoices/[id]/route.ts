import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { invoices, invoiceItems, clients, companySettings, pourings, sites } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { invoiceSchema, invoiceZodError } from "@/lib/invoices";
import { deleteDraftInvoice, issueInvoice, previewNumber, saveInvoice } from "@/lib/invoices-db";

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
  const related = invoice.relatedInvoiceId
    ? db.select({ id: invoices.id, number: invoices.number, date: invoices.date }).from(invoices).where(eq(invoices.id, invoice.relatedInvoiceId)).get()
    : null;
  const items = db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, parseInt(params.id))).all();

  // Фактурирани актове и известията към тази фактура
  const acts = db.select({ id: pourings.id, date: pourings.date, quantityM3: pourings.quantityM3, siteName: sites.name })
    .from(pourings).leftJoin(sites, eq(pourings.siteId, sites.id))
    .where(eq(pourings.invoiceId, invoice.id)).orderBy(asc(pourings.date)).all();
  const creditNotes = db.select({ id: invoices.id, number: invoices.number, type: invoices.type, date: invoices.date, total: invoices.total, status: invoices.status })
    .from(invoices).where(eq(invoices.relatedInvoiceId, invoice.id)).all();
  const nextNumber = invoice.status === "draft" && invoice.direction === "outgoing" ? previewNumber("outgoing", invoice.type) : null;

  return NextResponse.json({ ...invoice, items, company, related, acts, creditNotes, nextNumber });
}

// Редакция на чернова (цялата фактура — редове, клиент, дати, актове)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = invoiceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: invoiceZodError(parsed.error) }, { status: 400 });
  const saved = saveInvoice(parsed.data, parseInt(params.id));
  if ("error" in saved) return NextResponse.json({ error: saved.error }, { status: saved.status });
  return NextResponse.json(db.select().from(invoices).where(eq(invoices.id, saved.id)).get());
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

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Непозволена промяна — черновата се редактира изцяло, издадената само с известие" }, { status: 400 });
  }
  const { status, ...rest } = parsed.data;
  if (current.status === "sent" && status === "draft") {
    return NextResponse.json({ error: "Издадена фактура не може да се върне в чернова" }, { status: 409 });
  }
  // Издаване: номерът се дава тук (поредица без пропуски)
  if (status === "sent" && current.status === "draft") {
    const issued = issueInvoice(id);
    if ("error" in issued) return NextResponse.json({ error: issued.error }, { status: issued.status });
  }
  if (Object.keys(rest).length) {
    db.update(invoices).set({ ...rest, updatedAt: new Date().toISOString() }).where(eq(invoices.id, id)).run();
  }
  return NextResponse.json(db.select().from(invoices).where(eq(invoices.id, id)).get());
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = deleteDraftInvoice(parseInt(params.id));
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ success: true });
}
