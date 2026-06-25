import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { siteCalendar, sites } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const siteId = new URL(request.url).searchParams.get("siteId");
  const result = await db.select({
    id: siteCalendar.id, plannedDate: siteCalendar.plannedDate, estimatedM3: siteCalendar.estimatedM3, status: siteCalendar.status, notes: siteCalendar.notes,
    site: { id: sites.id, name: sites.name },
  }).from(siteCalendar).leftJoin(sites, eq(siteCalendar.siteId, sites.id))
    .where(siteId ? eq(siteCalendar.siteId, parseInt(siteId)) : undefined);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { siteId, plannedDate, concreteTypeId, estimatedM3, machineId, notes } = body;
  if (!siteId || !plannedDate) return NextResponse.json({ error: "Обект и дата са задължителни" }, { status: 400 });
  const result = await db.insert(siteCalendar).values({ siteId, plannedDate, concreteTypeId, estimatedM3, machineId, notes: notes || null, status: "planned" }).returning();
  return NextResponse.json(result[0], { status: 201 });
}
