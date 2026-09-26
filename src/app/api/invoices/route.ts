import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { invoices, invoiceItems, clients } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";
import { calcInvoiceTotals, roundMoney } from "@/lib/calc";
import { isInvoiceNumberTaken } from "@/lib/invoice-number";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  description: z.string().min(1),
  unit: z.string().default("бр."),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).default(20),
});

const invoiceSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  supplierId: z.coerce.number().int().positive().optional().nullable(),
  number: z.string().min(1),
  date: z.string().min(1),
  dueDate: z.string().min(1),
  taxEventDate: z.string().min(1),
  direction: z.enum(["incoming", "outgoing"]).default("outgoing"),
  type: z.enum(["invoice", "proforma", "credit_note", "debit_note"]).default("invoice"),
  currency: z.string().default("EUR"),
  discountPercent: z.coerce.number().min(0).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["bank", "cash", "card"]).default("bank"),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).default("unpaid"),
  relatedInvoiceId: z.coerce.number().int().positive().optional().nullable(),
  taxExemptionReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

export async function GET(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const conditions = [];
  if (statusFilter) conditions.push(eq(invoices.status, statusFilter));

  const result = db
    .select({
      id: invoices.id,
      clientId: invoices.clientId,
      number: invoices.number,
      date: invoices.date,
      dueDate: invoices.dueDate,
      direction: invoices.direction,
      type: invoices.type,
      currency: invoices.currency,
      total: invoices.total,
      vatAmount: invoices.vatAmount,
      paymentStatus: invoices.paymentStatus,
      status: invoices.status,
      notes: invoices.notes,
      pdfPath: invoices.pdfPath,
      clientName: clients.name,
      clientCompany: clients.companyName,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(invoices.date))
    .all();

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const items = parsed.data.items;
  const isNote = parsed.data.type === "credit_note" || parsed.data.type === "debit_note";

  if (isInvoiceNumberTaken(parsed.data.direction, parsed.data.number)) {
    return NextResponse.json({ error: `Номер ${parsed.data.number} вече съществува` }, { status: 409 });
  }
  // Кредитно/дебитно известие трябва да сочи фактурата, която коригира (чл. 115 ЗДДС)
  if (isNote) {
    const related = parsed.data.relatedInvoiceId
      ? db.select({ id: invoices.id }).from(invoices).where(eq(invoices.id, parsed.data.relatedInvoiceId)).get()
      : null;
    if (!related) {
      return NextResponse.json({ error: "Изберете фактурата, към която е известието" }, { status: 400 });
    }
  }
  const { subtotal, vatAmount, total } = calcInvoiceTotals(
    items,
    parsed.data.discountPercent,
    parsed.data.discountAmount,
  );

  const created = db.transaction((tx) => {
    const inv = tx
      .insert(invoices)
      .values({
        clientId: parsed.data.clientId,
        supplierId: parsed.data.supplierId || null,
        number: parsed.data.number,
        date: parsed.data.date,
        dueDate: parsed.data.dueDate,
        taxEventDate: parsed.data.taxEventDate,
        direction: parsed.data.direction,
        type: parsed.data.type,
        currency: parsed.data.currency,
        subtotal,
        discountPercent: parsed.data.discountPercent,
        discountAmount: parsed.data.discountAmount,
        vatRate: items[0]?.vatRate ?? 20,
        vatAmount,
        total,
        paymentMethod: parsed.data.paymentMethod,
        paymentStatus: parsed.data.paymentStatus,
        relatedInvoiceId: isNote ? parsed.data.relatedInvoiceId : null,
        taxExemptionReason: parsed.data.taxExemptionReason || null,
        notes: parsed.data.notes || null,
      })
      .returning()
      .get();

    for (const item of items) {
      tx.insert(invoiceItems).values({
        invoiceId: inv.id,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        price: item.price,
        vatRate: item.vatRate,
        total: roundMoney(item.quantity * item.price),
      }).run();
    }

    return inv;
  });

  // Клиентът не се известява автоматично — фактурата е чернова; изпраща се ръчно
  // от страницата ѝ („Изпрати“, с PDF), след като е издадена.
  return NextResponse.json(created, { status: 201 });
}
