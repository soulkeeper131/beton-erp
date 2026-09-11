import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, lte, and, sql } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";
import { calcInvoiceTotals, nextRecurringDate, nextInvoiceNumber } from "@/lib/calc";

export const dynamic = "force-dynamic";

// Генерира фактури за всички активни периодични, чийто nextDate е настъпил.
export async function POST(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const due = db
    .select()
    .from(schema.recurringInvoices)
    .where(and(eq(schema.recurringInvoices.active, true), lte(schema.recurringInvoices.nextDate, today)))
    .all();

  const generated: { id: number; name: string; invoiceNumber: string }[] = [];

  for (const rec of due) {
    let items: any[] = [];
    try {
      items = JSON.parse(rec.items || "[]");
    } catch {}
    if (!Array.isArray(items) || items.length === 0) continue;

    const { subtotal, vatAmount, total } = calcInvoiceTotals(items);

    // Номер: следващ изходящ номер (MAX подход, без колазии)
    const maxRow = db
      .select({ number: schema.invoices.number })
      .from(schema.invoices)
      .where(eq(schema.invoices.direction, "outgoing"))
      .orderBy(sql`id desc`)
      .limit(100)
      .all();
    const number = nextInvoiceNumber("outgoing", maxRow.map((r) => r.number || ""));

    // dueDate = +30 дни
    const dueDate = nextRecurringDate(today, "monthly");

    const inv = db.transaction((tx) => {
      const created = tx
        .insert(schema.invoices)
        .values({
          clientId: rec.clientId,
          number,
          date: today,
          dueDate,
          taxEventDate: today,
          direction: rec.direction || "outgoing",
          type: "invoice",
          currency: "EUR",
          subtotal,
          discountPercent: 0,
          discountAmount: 0,
          vatRate: items[0]?.vatRate ?? 20,
          vatAmount,
          total,
          paymentMethod: "bank",
          paymentStatus: "unpaid",
          status: "draft",
          notes: rec.notes || `Периодична фактура: ${rec.name}`,
        })
        .returning()
        .get();

      for (const item of items) {
        tx.insert(schema.invoiceItems).values({
          invoiceId: created.id,
          description: item.description,
          unit: item.unit || "бр.",
          quantity: item.quantity,
          price: item.price,
          vatRate: item.vatRate ?? 20,
          total: item.quantity * item.price,
        }).run();
      }

      return created;
    });

    // Обновяваме nextDate (+1 месец или +1 седмица)
    const next = nextRecurringDate(rec.nextDate, rec.frequency as "monthly" | "weekly");

    db.update(schema.recurringInvoices)
      .set({ nextDate: next, lastGenerated: today })
      .where(eq(schema.recurringInvoices.id, rec.id));

    generated.push({ id: rec.id, name: rec.name, invoiceNumber: inv.number });
  }

  return NextResponse.json({ generated, count: generated.length });
}
