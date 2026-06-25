import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { sites, clients } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const siteSchema = z.object({
  clientId: z.number().int().positive("Клиентът е задължителен"),
  name: z.string().min(1, "Името е задължително"),
  address: z.string().min(1, "Адресът е задължителен"),
  status: z.enum(["active", "completed", "cancelled"]).default("active"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional().default(""),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let result;
  if (status && status !== "all") {
    result = await db
      .select({
        id: sites.id,
        clientId: sites.clientId,
        name: sites.name,
        address: sites.address,
        status: sites.status,
        startDate: sites.startDate,
        endDate: sites.endDate,
        notes: sites.notes,
        createdAt: sites.createdAt,
        updatedAt: sites.updatedAt,
        clientName: clients.name,
        clientCompany: clients.companyName,
      })
      .from(sites)
      .leftJoin(clients, eq(sites.clientId, clients.id))
      .where(eq(sites.status, status))
      .orderBy(asc(sites.name))
      .all();
  } else {
    result = await db
      .select({
        id: sites.id,
        clientId: sites.clientId,
        name: sites.name,
        address: sites.address,
        status: sites.status,
        startDate: sites.startDate,
        endDate: sites.endDate,
        notes: sites.notes,
        createdAt: sites.createdAt,
        updatedAt: sites.updatedAt,
        clientName: clients.name,
        clientCompany: clients.companyName,
      })
      .from(sites)
      .leftJoin(clients, eq(sites.clientId, clients.id))
      .orderBy(asc(sites.name))
      .all();
  }

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = siteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [created] = await db
    .insert(sites)
    .values({
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      address: parsed.data.address,
      status: parsed.data.status,
      startDate: parsed.data.startDate || null,
      endDate: parsed.data.endDate || null,
      notes: parsed.data.notes || null,
    })
    .returning()
    .all();

  return NextResponse.json(created, { status: 201 });
}
