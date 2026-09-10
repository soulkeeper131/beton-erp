import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { workerAttendance, workers, sites } from "@/db/schema";
import { eq, desc, like, and } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const attendanceSchema = z.object({
  workerId: z.coerce.number().int().positive("Изберете работник"),
  date: z.string().min(1, "Датата е задължителна"),
  siteId: z.coerce.number().int().optional().nullable(),
  hours: z.coerce.number().min(0).default(8),
  overtime: z.coerce.number().min(0).default(0),
  advance: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const workerId = searchParams.get("workerId");

  const conditions: any[] = [];
  if (month) conditions.push(like(workerAttendance.date, `${month}%`));
  if (workerId) conditions.push(eq(workerAttendance.workerId, parseInt(workerId)));

  const result = db
    .select({
      id: workerAttendance.id,
      workerId: workerAttendance.workerId,
      date: workerAttendance.date,
      siteId: workerAttendance.siteId,
      hours: workerAttendance.hours,
      overtime: workerAttendance.overtime,
      advance: workerAttendance.advance,
      notes: workerAttendance.notes,
      workerName: workers.name,
      dailyRate: workers.dailyRate,
      overtimeRate: workers.overtimeRate,
      siteName: sites.name,
    })
    .from(workerAttendance)
    .leftJoin(workers, eq(workerAttendance.workerId, workers.id))
    .leftJoin(sites, eq(workerAttendance.siteId, sites.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(workerAttendance.date))
    .all();

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = attendanceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [created] = db
    .insert(workerAttendance)
    .values({
      workerId: parsed.data.workerId,
      date: parsed.data.date,
      siteId: parsed.data.siteId || null,
      hours: parsed.data.hours,
      overtime: parsed.data.overtime,
      advance: parsed.data.advance,
      notes: parsed.data.notes || null,
    })
    .returning()
    .all();

  return NextResponse.json(created, { status: 201 });
}
