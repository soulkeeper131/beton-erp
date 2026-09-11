import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, lte, and, sql } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";

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

    const subtotal = items.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.price || 0), 0);
    const vatAmount = items.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.price || 0) * (i.vatRate ?? 20) / 100, 0);
    const total = subtotal + vatAmount;

    // Номер: следващ изходящ номер (MAX подход, без колазии)
    const maxRow = db
      .select({ number: schema.invoices.number })
      .from(schema.invoices)
      .where(eq(schema.invoices.direction, "outgoing"))
      .orderBy(sql`id desc`)
      .limit(100)
      .all();
    let maxNum = 0;
    for (const r of maxRow) {
      const m = r.number?.match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
    }
    const number = `ИЗХ-${String(maxNum + 1).padStart(6, "0")}`;

    // dueDate = +30 дни
    const dueDate = addDays(today, 30);

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

    // Обновяваме nextDate
    let next = rec.nextDate;
    if (rec.frequency === "weekly") {
      next = addDays(next, 7);
    } else {
      next = addMonths(next, 1);
    }

    db.update(schema.recurringInvoices)
      .set({ nextDate: next, lastGenerated: today })
      .where(eq(schema.recurringInvoices.id, rec.id));

    generated.push({ id: rec.id, name: rec.name, invoiceNumber: inv.number });
  }

  return NextResponse.json({ generated, count: generated.length });
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function addMonths(date: string, months: number): string {
  const d = new Date(date + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}
