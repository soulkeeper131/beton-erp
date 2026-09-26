import { db } from "@/db";
import { invoices } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { nextInvoiceNumber } from "@/lib/calc";

// Единствен източник на номера на фактури (API, агент, периодични, имейл).
// MAX + 1 по посока — след изтриване на чернова не се получава дублиран номер.
export function getNextInvoiceNumber(direction: "outgoing" | "incoming"): string {
  const rows = db.select({ number: invoices.number }).from(invoices).where(eq(invoices.direction, direction)).all();
  return nextInvoiceNumber(direction, rows.map((r) => r.number || ""));
}

export function isInvoiceNumberTaken(direction: string, number: string): boolean {
  return !!db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.direction, direction), eq(invoices.number, number)))
    .get();
}
