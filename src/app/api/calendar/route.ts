import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { siteCalendar, sites } from "@/db/schema";
import { eq, gte, lte, and } from "drizzle-orm";
import { monthEnd } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const month = searchParams.get("month"); // YYYY-MM

  let where: any = undefined;
  const conditions: any[] = [];

  if (siteId) conditions.push(eq(siteCalendar.siteId, parseInt(siteId)));
  if (month) {
    const start = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const end = monthEnd(y, m); // last day of month
    conditions.push(gte(siteCalendar.plannedDate, start));
    conditions.push(lte(siteCalendar.plannedDate, end));
  }

  if (conditions.length > 0) where = and(...conditions);

  const result = await db
    .select({
      id: siteCalendar.id,
      plannedDate: siteCalendar.plannedDate,
      estimatedM3: siteCalendar.estimatedM3,
      status: siteCalendar.status,
      notes: siteCalendar.notes,
      siteName: sites.name,
    })
    .from(siteCalendar)
    .leftJoin(sites, eq(siteCalendar.siteId, sites.id))
    .where(where)
    .orderBy(siteCalendar.plannedDate)
    .all();

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { siteId, plannedDate, concreteTypeId, estimatedM3, machineId, notes } = body;
  if (!siteId || !plannedDate)
    return NextResponse.json({ error: "Обект и дата са задължителни" }, { status: 400 });
  if (!db.select({ id: sites.id }).from(sites).where(eq(sites.id, Number(siteId))).get())
    return NextResponse.json({ error: "Обектът не съществува" }, { status: 400 });

  const [result] = await db
    .insert(siteCalendar)
    .values({
      siteId,
      plannedDate,
      concreteTypeId: concreteTypeId || null,
      estimatedM3: estimatedM3 || null,
      machineId: machineId || null,
      notes: notes || null,
      status: "planned",
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  // Само позволени полета (преди — произволни)
  const update: Record<string, any> = {};
  for (const k of ["siteId", "plannedDate", "concreteTypeId", "estimatedM3", "machineId", "teamLeadId", "status", "notes"]) {
    if (body?.[k] !== undefined) update[k] = body[k];
  }
  if (update.status && !["planned", "confirmed", "done", "postponed"].includes(update.status)) {
    return NextResponse.json({ error: "Невалиден статус" }, { status: 400 });
  }
  const result = await db
    .update(siteCalendar)
    .set(update)
    .where(eq(siteCalendar.id, parseInt(id)))
    .returning()
    .get();

  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(siteCalendar).where(eq(siteCalendar.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}
