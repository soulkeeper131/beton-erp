import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, clients } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";
import { invoiceSchema, invoiceZodError } from "@/lib/invoices";
import { issueInvoice, saveInvoice } from "@/lib/invoices-db";

export const dynamic = "force-dynamic";

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

  const body = await req.json().catch(() => null);
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: invoiceZodError(parsed.error) }, { status: 400 });

  // Изходящите се записват като чернова; issue: true я издава веднага (получава номер)
  const saved = saveInvoice(parsed.data);
  if ("error" in saved) return NextResponse.json({ error: saved.error }, { status: saved.status });
  if (body?.issue === true) {
    const issued = issueInvoice(saved.id);
    if ("error" in issued) {
      return NextResponse.json({ id: saved.id, error: `Записана като чернова, но не е издадена: ${issued.error}` }, { status: 409 });
    }
  }
  // Клиентът не се известява автоматично — изпраща се ръчно от страницата на фактурата
  const created = db.select().from(invoices).where(eq(invoices.id, saved.id)).get();
  return NextResponse.json(created, { status: 201 });
}
