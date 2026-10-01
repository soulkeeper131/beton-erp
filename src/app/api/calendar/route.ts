import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { siteCalendar, sites, concreteTypes, machines } from "@/db/schema";
import { eq, gte, lte, and, ne } from "drizzle-orm";
import { z } from "zod";
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
      siteId: siteCalendar.siteId,
      concreteTypeId: siteCalendar.concreteTypeId,
      machineId: siteCalendar.machineId,
      siteName: sites.name,
      concreteTypeName: concreteTypes.name,
      machineName: machines.name,
    })
    .from(siteCalendar)
    .leftJoin(sites, eq(siteCalendar.siteId, sites.id))
    .leftJoin(concreteTypes, eq(siteCalendar.concreteTypeId, concreteTypes.id))
    .leftJoin(machines, eq(siteCalendar.machineId, machines.id))
    .where(where)
    .orderBy(siteCalendar.plannedDate)
    .all();

  return NextResponse.json(result);
}

const optId = z.preprocess((v) => (v === "" || v === 0 ? null : v), z.coerce.number().int().positive().nullable().optional());
const entrySchema = z.object({
  siteId: z.coerce.number({ invalid_type_error: "Изберете обект" }).int().positive("Изберете обект"),
  plannedDate: z.string({ required_error: "Изберете дата" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Невалидна дата"),
  concreteTypeId: optId,
  machineId: optId,
  teamLeadId: optId,
  estimatedM3: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().min(0, "Количеството не може да е отрицателно").nullable().optional()),
  status: z.enum(["planned", "confirmed", "done", "postponed"], { errorMap: () => ({ message: "Невалиден статус" }) }).optional(),
  notes: z.string().nullable().optional(),
});

// Същата машина в същия ден на друг обект — предупреждение (не забрана: може да успее и на двата)
function machineConflicts(machineId: number | null | undefined, date: string, excludeId?: number) {
  if (!machineId) return [];
  return db.select({ id: siteCalendar.id, siteName: sites.name })
    .from(siteCalendar).leftJoin(sites, eq(siteCalendar.siteId, sites.id))
    .where(and(eq(siteCalendar.machineId, machineId), eq(siteCalendar.plannedDate, date), ne(siteCalendar.status, "done")))
    .all().filter((r) => r.id !== excludeId);
}

function warningsFor(machineId: number | null | undefined, date: string, excludeId?: number): string[] {
  const c = machineConflicts(machineId, date, excludeId);
  if (!c.length) return [];
  const m = db.select({ name: machines.name }).from(machines).where(eq(machines.id, machineId!)).get();
  return [`${m?.name || "Машината"} е планирана и на ${c.map((x) => x.siteName || "друг обект").join(", ")} в същия ден`];
}

export async function POST(request: NextRequest) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = entrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Невалидни данни" }, { status: 400 });
  const d = parsed.data;
  if (!db.select({ id: sites.id }).from(sites).where(eq(sites.id, d.siteId)).get())
    return NextResponse.json({ error: "Обектът не съществува" }, { status: 400 });

  const result = db.insert(siteCalendar).values({
    siteId: d.siteId,
    plannedDate: d.plannedDate,
    concreteTypeId: d.concreteTypeId ?? null,
    estimatedM3: d.estimatedM3 ?? null,
    machineId: d.machineId ?? null,
    teamLeadId: d.teamLeadId ?? null,
    notes: d.notes || null,
    status: d.status || "planned",
  }).returning().get();

  return NextResponse.json({ ...result, warnings: warningsFor(d.machineId, d.plannedDate, result.id) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const current = db.select().from(siteCalendar).where(eq(siteCalendar.id, id)).get();
  if (!current) return NextResponse.json({ error: "Записът не е намерен" }, { status: 404 });

  // Само позволени полета (преди — произволни)
  const parsed = entrySchema.partial().safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Невалидни данни" }, { status: 400 });
  const update = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  if (update.siteId && !db.select({ id: sites.id }).from(sites).where(eq(sites.id, update.siteId as number)).get())
    return NextResponse.json({ error: "Обектът не съществува" }, { status: 400 });

  const result = Object.keys(update).length
    ? db.update(siteCalendar).set(update).where(eq(siteCalendar.id, id)).returning().get()
    : current;
  return NextResponse.json({ ...result, warnings: warningsFor(result.machineId, result.plannedDate, id) });
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
