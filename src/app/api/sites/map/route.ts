import { NextResponse } from "next/server";
import { db } from "@/db";
import { sites, offers, pourings, pouringItems, siteCalendar, clients } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET() {
  const allSites = await db
    .select({
      id: sites.id,
      name: sites.name,
      address: sites.address,
      city: sites.city,
      latitude: sites.latitude,
      longitude: sites.longitude,
      status: sites.status,
      clientName: clients.name,
    })
    .from(sites)
    .leftJoin(clients, eq(sites.clientId, clients.id))
    .all();

  const withCoords = allSites.filter(s => s.latitude != null && s.longitude != null);

  // For each site, gather stats
  const enriched = await Promise.all(withCoords.map(async (site) => {
    // Offers for this site
    const siteOffers = await db
      .select({
        status: offers.status,
        total: offers.total,
      })
      .from(offers)
      .where(eq(offers.siteId, site.id))
      .all();

    const offersCount = siteOffers.length;
    const offersSent = siteOffers.filter(o => o.status === "sent" || o.status === "accepted").length;
    const offersAccepted = siteOffers.filter(o => o.status === "accepted").length;
    const offersTotal = siteOffers.reduce((s, o) => s + (o.total || 0), 0);

    // Pourings for this site
    const sitePourings = await db
      .select({
        status: pourings.status,
      })
      .from(pourings)
      .where(eq(pourings.siteId, site.id))
      .all();

    const pouringsCount = sitePourings.length;

    // Total m3 poured
    const m3Result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${pouringItems.quantityM3}), 0)`.as("total"),
      })
      .from(pouringItems)
      .innerJoin(pourings, eq(pouringItems.pouringId, pourings.id))
      .where(eq(pourings.siteId, site.id))
      .get();

    const totalM3 = m3Result?.total || 0;

    // Calendar events
    const upcomingEvents = await db
      .select({ plannedDate: siteCalendar.plannedDate })
      .from(siteCalendar)
      .where(
        and(
          eq(siteCalendar.siteId, site.id),
          sql`${siteCalendar.plannedDate} >= date('now')`
        )
      )
      .all();

    const nextEvent = upcomingEvents.length > 0
      ? upcomingEvents.sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))[0].plannedDate
      : null;

    // Progress calculation
    let progress = 0;
    let progressLabel = "";
    if (offersAccepted > 0 && totalM3 > 0) {
      // Estimate total offered m3 from accepted offers (approximate)
      // Use pourings count vs offers count as progress
      progress = Math.min(100, Math.round((pouringsCount / Math.max(offersAccepted, 1)) * 100));
      progressLabel = `${pouringsCount}/${offersAccepted} акта`;
    } else if (site.status === "completed") {
      progress = 100;
      progressLabel = "Завършен";
    } else if (offersCount > 0) {
      progress = offersAccepted > 0 ? 30 : 10;
      progressLabel = offersAccepted > 0 ? "Офериран" : "В процес";
    } else if (pouringsCount > 0) {
      progress = 50;
      progressLabel = "В работа";
    }

    return {
      ...site,
      stats: {
        offersCount,
        offersSent,
        offersAccepted,
        offersTotal,
        pouringsCount,
        totalM3,
        nextEvent,
        progress,
        progressLabel,
      }
    };
  }));

  return NextResponse.json(enriched);
}
