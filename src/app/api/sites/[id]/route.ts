import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { sites, clients, pourings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  clientId: z.number().int().positive().optional(),
  name: z.string().min(1).optional(),
  city: z.string().optional(),
  address: z.string().min(1).optional(),
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const site = await db
    .select({
      id: sites.id,
      clientId: sites.clientId,
      name: sites.name,
      city: sites.city,
      address: sites.address,
      status: sites.status,
      startDate: sites.startDate,
      endDate: sites.endDate,
      notes: sites.notes,
      latitude: sites.latitude,
      longitude: sites.longitude,
      createdAt: sites.createdAt,
      updatedAt: sites.updatedAt,
      clientName: clients.name,
      clientCompany: clients.companyName,
    })
    .from(sites)
    .leftJoin(clients, eq(sites.clientId, clients.id))
    .where(eq(sites.id, parseInt(params.id)))
    .get();

  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Also get recent pourings
  const recentPourings = await db
    .select()
    .from(pourings)
    .where(eq(pourings.siteId, parseInt(params.id)))
    .orderBy(desc(pourings.date))
    .limit(20)
    .all();

  return NextResponse.json({ ...site, pourings: recentPourings });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(sites)
    .where(eq(sites.id, parseInt(params.id)))
    .get();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db
    .update(sites)
    .set(parsed.data)
    .where(eq(sites.id, parseInt(params.id)))
    .returning()
    .all();

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db
    .select()
    .from(sites)
    .where(eq(sites.id, parseInt(params.id)))
    .get();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(sites).where(eq(sites.id, parseInt(params.id)));
  return NextResponse.json({ success: true });
}
