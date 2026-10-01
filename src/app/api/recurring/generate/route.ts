import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, lte, and } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";
import { nextRecurringDate } from "@/lib/calc";
import { getNextInvoiceNumber } from "@/lib/invoice-number";
import { invoiceSchema, invoiceZodError } from "@/lib/invoices";
import { saveInvoice } from "@/lib/invoices-db";
import { today as todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Генерира фактури за всички активни периодични, чийто nextDate е настъпил.
export async function POST(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = todayStr();

  const due = db
    .select()
    .from(schema.recurringInvoices)
    .where(and(eq(schema.recurringInvoices.active, true), lte(schema.recurringInvoices.nextDate, today)))
    .all();

  const generated: { id: number; name: string; invoiceNumber: string }[] = [];
  const errors: { id: number; name: string; error: string }[] = [];

  for (const rec of due) {
    let items: any[] = [];
    try {
      items = JSON.parse(rec.items || "[]");
    } catch {}
    if (!Array.isArray(items) || items.length === 0) continue;

    // dueDate = +1 месец
    const dueDate = nextRecurringDate(today, "monthly");
    const parsed = invoiceSchema.safeParse({
      clientId: rec.clientId, date: today, dueDate, taxEventDate: today,
      direction: rec.direction || "outgoing", type: "invoice",
      number: rec.direction === "incoming" ? getNextInvoiceNumber("incoming") : null,
      notes: rec.notes || `Периодична фактура: ${rec.name}`, items,
    });
    if (!parsed.success) { errors.push({ id: rec.id, name: rec.name, error: invoiceZodError(parsed.error) }); continue; }

    // Чернова (изходящите получават номер при издаване) + nextDate в същата транзакция.
    // Преди nextDate не се местеше и всяко генериране правеше нова фактура за същия период.
    const saved = saveInvoice(parsed.data, null, (tx, _id) => {
      tx.update(schema.recurringInvoices)
        .set({ nextDate: nextRecurringDate(rec.nextDate, rec.frequency as "monthly" | "weekly"), lastGenerated: today })
        .where(eq(schema.recurringInvoices.id, rec.id))
        .run();
    });
    if ("error" in saved) { errors.push({ id: rec.id, name: rec.name, error: saved.error }); continue; }
    const inv = db.select({ number: schema.invoices.number }).from(schema.invoices).where(eq(schema.invoices.id, saved.id)).get()!;

    generated.push({ id: rec.id, name: rec.name, invoiceNumber: inv.number });
  }

  return NextResponse.json({ generated, count: generated.length, errors });
}
