import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, sum, and, gte, lte, eq, ne, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const thirtyDaysStr = thirtyDays.toISOString().split("T")[0];

  // KPI: monthly revenue (sent invoices only)
  const revResult = (await db
    .select({ total: sum(schema.invoices.total) })
    .from(schema.invoices)
    .where(and(eq(schema.invoices.status, "sent"), gte(schema.invoices.date, monthStart)))
    .get()) as { total: number | null };
  const monthlyRevenue = revResult?.total || 0;

  // KPI: open offers
  const offersResult = (await db
    .select({ cnt: count() })
    .from(schema.offers)
    .where(or(eq(schema.offers.status, "draft"), eq(schema.offers.status, "sent")))
    .get()) as { cnt: number };
  const openOffers = offersResult?.cnt || 0;

  // KPI: unpaid invoices
  const unpaidResult = (await db
    .select({ cnt: count() })
    .from(schema.invoices)
    .where(and(eq(schema.invoices.status, "sent"), ne(schema.invoices.paymentStatus, "paid")))
    .get()) as { cnt: number };
  const unpaidInvoices = unpaidResult?.cnt || 0;

  // KPI: active sites
  const sitesResult = (await db
    .select({ cnt: count() })
    .from(schema.sites)
    .where(eq(schema.sites.status, "active"))
    .get()) as { cnt: number };
  const activeSites = sitesResult?.cnt || 0;

  // KPI: workers today
  const attResult = (await db
    .select({ cnt: count() })
    .from(schema.workerAttendance)
    .where(eq(schema.workerAttendance.date, today))
    .get()) as { cnt: number };
  const workersToday = attResult?.cnt || 0;

  // KPI: monthly pourings m3
  const pourResult = (await db
    .select({ total: sum(schema.pourings.quantityM3) })
    .from(schema.pourings)
    .where(gte(schema.pourings.date, monthStart))
    .get()) as { total: number | null };
  const totalPouringsM3 = pourResult?.total || 0;

  // Upcoming calendar (next 7 days)
  const upcomingCalendar = await db
    .select({
      date: schema.siteCalendar.plannedDate,
      siteName: schema.sites.name,
      concreteType: schema.concreteTypes.name,
      estimatedM3: schema.siteCalendar.estimatedM3,
      status: schema.siteCalendar.status,
    })
    .from(schema.siteCalendar)
    .leftJoin(schema.sites, eq(schema.siteCalendar.siteId, schema.sites.id))
    .leftJoin(schema.concreteTypes, eq(schema.siteCalendar.concreteTypeId, schema.concreteTypes.id))
    .where(and(
      gte(schema.siteCalendar.plannedDate, today),
      lte(schema.siteCalendar.plannedDate, nextWeekStr),
      ne(schema.siteCalendar.status, "done"),
    ))
    .orderBy(schema.siteCalendar.plannedDate)
    .limit(10)
    .all();

  // Machines with expiring docs
  const allMachines = await db.select().from(schema.machines).all();
  const expiringDocs: { machineName: string; type: string; expiryDate: string; status: string }[] = [];
  allMachines.forEach(m => {
    const fields = [
      { machineName: m.name, type: "vignette", expiryDate: m.vignetteExpiry },
      { machineName: m.name, type: "insurance", expiryDate: m.insuranceExpiry },
      { machineName: m.name, type: "tech", expiryDate: m.techInspectionExpiry },
    ] as const;
    fields.forEach(f => {
      if (!f.expiryDate) return;
      const status = f.expiryDate < today ? "expired" : f.expiryDate <= thirtyDaysStr ? "expiring" : null;
      if (status) expiringDocs.push({ machineName: f.machineName, type: f.type, expiryDate: f.expiryDate, status });
    });
  });
  expiringDocs.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  // Low stock
  const lowStock = await db
    .select({
      name: schema.materials.name,
      quantity: schema.materials.quantity,
      unit: schema.materials.unit,
      minThreshold: schema.materials.minThreshold,
    })
    .from(schema.materials)
    .where(and(
      gte(schema.materials.minThreshold, 0.01),
      lte(schema.materials.quantity, schema.materials.minThreshold),
    ))
    .all();

  return NextResponse.json({
    monthlyRevenue,
    openOffers,
    unpaidInvoices,
    activeSites,
    workersToday,
    totalPouringsM3,
    upcomingCalendar,
    expiringDocs,
    lowStock,
  });
}
