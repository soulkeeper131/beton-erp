import { z } from "zod";
import { db } from "@/db";
import { clients, sites, offers, invoices, recurringInvoices, pourings, siteCalendar, workerAttendance, actPhotos } from "@/db/schema";
import { and, eq, ne, or } from "drizzle-orm";

const optText = z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : null));

export const clientSchema = z.object({
  name: z.string({ required_error: "Името е задължително" }).trim().min(1, "Името е задължително"),
  companyName: optText,
  eik: optText.refine((v) => v == null || /^(\d{9}|\d{10}|\d{13})$/.test(v), "ЕИК/ЕГН трябва да е 9, 10 или 13 цифри"),
  vatNumber: optText,
  address: optText,
  phone: optText,
  email: optText.refine((v) => v == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Невалиден имейл"),
  notes: optText,
});

/** Клиент със същия ЕИК (без текущия) — за да няма дублирани клиенти. */
export function findClientByEik(eik: string, exceptId?: number) {
  return db
    .select({ id: clients.id, name: clients.name, companyName: clients.companyName })
    .from(clients)
    .where(exceptId ? and(eq(clients.eik, eik), ne(clients.id, exceptId)) : eq(clients.eik, eik))
    .get();
}

const has = (q: { get: () => unknown }) => !!q.get();

/** Къде се ползва клиентът — празен масив = може да се изтрие. */
export function clientUsage(id: number): string[] {
  return [
    has(db.select({ id: sites.id }).from(sites).where(eq(sites.clientId, id)).limit(1)) && "обекти",
    has(db.select({ id: offers.id }).from(offers).where(eq(offers.clientId, id)).limit(1)) && "оферти",
    has(db.select({ id: invoices.id }).from(invoices).where(or(eq(invoices.clientId, id), eq(invoices.supplierId, id))).limit(1)) && "фактури",
    has(db.select({ id: recurringInvoices.id }).from(recurringInvoices).where(eq(recurringInvoices.clientId, id)).limit(1)) && "периодични фактури",
  ].filter(Boolean) as string[];
}

/** Къде се ползва обектът — празен масив = може да се изтрие. */
export function siteUsage(id: number): string[] {
  return [
    has(db.select({ id: pourings.id }).from(pourings).where(eq(pourings.siteId, id)).limit(1)) && "актове",
    has(db.select({ id: offers.id }).from(offers).where(eq(offers.siteId, id)).limit(1)) && "оферти",
    has(db.select({ id: siteCalendar.id }).from(siteCalendar).where(eq(siteCalendar.siteId, id)).limit(1)) && "календара",
    has(db.select({ id: workerAttendance.id }).from(workerAttendance).where(eq(workerAttendance.siteId, id)).limit(1)) && "явки",
    has(db.select({ id: actPhotos.id }).from(actPhotos).where(eq(actPhotos.siteId, id)).limit(1)) && "снимки",
  ].filter(Boolean) as string[];
}
