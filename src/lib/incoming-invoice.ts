import { db } from "@/db";
import { clients, invoices } from "@/db/schema";
import { and, eq, like } from "drizzle-orm";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { getNextInvoiceNumber } from "@/lib/invoice-number";
import { roundMoney } from "@/lib/calc";
import type { ParsedInvoice } from "@/lib/invoice-parser";
import type { FetchedEmail } from "@/lib/imap";
import { sofiaDate } from "@/lib/dates";

export type ImportResult =
  | { status: "created"; id: number; number: string; confidence: string; supplier: string }
  | { status: "duplicate"; id: number }
  | { status: "skipped"; reason: string };

/** Име от „Иван Иванов <ivan@x.bg>“ → „Иван Иванов“ (или самият адрес). */
function senderName(from: string): string {
  const m = from.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/);
  return (m ? m[1] : from).trim() || "Неизвестен доставчик";
}

/**
 * Намира доставчика по ЕИК или го създава. Без разпознат ЕИК — доставчик от
 * подателя на имейла с бележка за проверка (преди clientId=0 → FK грешка и целият
 * импорт спираше).
 */
function resolveSupplier(parsed: ParsedInvoice, email: Pick<FetchedEmail, "from">): number {
  if (parsed.supplierEik) {
    const existing = db.select({ id: clients.id }).from(clients).where(eq(clients.eik, parsed.supplierEik)).get();
    if (existing) return existing.id;
  }
  const name = parsed.supplierName || senderName(email.from);
  if (!parsed.supplierEik) {
    // Същият подател без ЕИК — ползваме вече създадения доставчик
    const byName = db.select({ id: clients.id }).from(clients)
      .where(and(eq(clients.name, name), like(clients.notes, "%от имейл%"))).get();
    if (byName) return byName.id;
  }
  return db.insert(clients).values({
    name,
    companyName: parsed.supplierName || null,
    eik: parsed.supplierEik || null,
    vatNumber: parsed.supplierVat || null,
    email: email.from.match(/<([^>]+)>/)?.[1] || (email.from.includes("@") ? email.from.trim() : null),
    notes: parsed.supplierEik
      ? "Създаден автоматично от имейл"
      : "Създаден автоматично от имейл — ЕИК не е разпознат, проверете данните",
  }).returning({ id: clients.id }).get().id;
}

/** Създава чернова на входяща фактура от имейл (без дубли). */
export function importIncomingEmail(
  email: FetchedEmail,
  parsed: ParsedInvoice,
  pdf: { filename: string; content: Buffer },
): ImportResult {
  const uidTag = `"emailUid":${email.uid}`;
  const sameEmail = db.select({ id: invoices.id }).from(invoices)
    .where(and(eq(invoices.direction, "incoming"), like(invoices.notes, `%${uidTag},%`))).get();
  if (sameEmail) return { status: "duplicate", id: sameEmail.id };

  const supplierId = resolveSupplier(parsed, email);

  // Същата фактура от същия доставчик (напр. изпратена повторно)
  if (parsed.invoiceNumber) {
    const dup = db.select({ id: invoices.id }).from(invoices).where(and(
      eq(invoices.direction, "incoming"),
      eq(invoices.clientId, supplierId),
      like(invoices.notes, `%"originalNumber":${JSON.stringify(parsed.invoiceNumber)}%`),
    )).get();
    if (dup) return { status: "duplicate", id: dup.id };
  }

  const pdfDir = path.join(process.cwd(), "data", "incoming-invoices");
  mkdirSync(pdfDir, { recursive: true });
  const pdfPath = path.join(pdfDir, `${Date.now()}-${pdf.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  writeFileSync(pdfPath, pdf.content);

  const date = parsed.date || sofiaDate(email.date);
  const total = roundMoney(parsed.total || 0);
  const vat = roundMoney(parsed.vatAmount || 0);
  const number = getNextInvoiceNumber("incoming");

  const invoice = db.insert(invoices).values({
    clientId: supplierId,
    number,
    date,
    dueDate: parsed.dueDate || date,
    taxEventDate: date,
    direction: "incoming",
    type: "invoice",
    currency: "EUR",
    // Основата е без ДДС (преди се записваше общата сума като основа)
    subtotal: roundMoney(Math.max(0, total - vat)),
    vatAmount: vat,
    vatRate: total > vat && vat > 0 ? Math.round((vat / (total - vat)) * 100) : 20,
    total,
    paymentStatus: "unpaid",
    status: "draft",
    pdfPath,
    // emailUid първи — по него се разпознава вече обработен имейл
    notes: `{${uidTag},` + JSON.stringify({
      source: "email",
      subject: email.subject,
      from: email.from,
      originalNumber: parsed.invoiceNumber || "",
      confidence: parsed.confidence,
    }).slice(1),
  }).returning({ id: invoices.id }).get();

  return {
    status: "created",
    id: invoice.id,
    number,
    confidence: parsed.confidence,
    supplier: parsed.supplierName || senderName(email.from),
  };
}
