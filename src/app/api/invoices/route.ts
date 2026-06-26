import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { invoices, invoiceItems, clients, companySettings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

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

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      clientName: clients.name,
      clientCompany: clients.companyName,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(invoices.date))
    .all();

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const items = parsed.data.items;
  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const vatAmount = items.reduce((s, i) => s + (i.quantity * i.price * i.vatRate) / 100, 0);
  const afterDiscount = subtotal - (subtotal * parsed.data.discountPercent / 100) - parsed.data.discountAmount;
  const total = afterDiscount + vatAmount;

  const created = db
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
      subtotal: afterDiscount,
      discountPercent: parsed.data.discountPercent,
      discountAmount: parsed.data.discountAmount,
      vatRate: items[0]?.vatRate || 20,
      vatAmount,
      total,
      paymentMethod: parsed.data.paymentMethod,
      paymentStatus: parsed.data.paymentStatus,
      relatedInvoiceId: parsed.data.relatedInvoiceId || null,
      taxExemptionReason: parsed.data.taxExemptionReason || null,
      notes: parsed.data.notes || null,
    })
    .returning()
    .get();

  for (const item of items) {
    db.insert(invoiceItems).values({
      invoiceId: created.id,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      vatRate: item.vatRate,
      total: item.quantity * item.price,
    }).run();
  }

  return NextResponse.json(created, { status: 201 });
}
