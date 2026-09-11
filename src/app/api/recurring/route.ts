import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { recurringInvoices, clients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  description: z.string().min(1),
  unit: z.string().default("бр."),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).default(20),
});

const recurringSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  name: z.string().min(1),
  frequency: z.enum(["monthly", "weekly"]).default("monthly"),
  dayOfMonth: z.coerce.number().int().min(1).max(31).default(1),
  nextDate: z.string().min(1),
  direction: z.enum(["outgoing", "incoming"]).default("outgoing"),
  items: z.array(itemSchema).min(1),
  notes: z.string().optional().nullable(),
  active: z.coerce.boolean().default(true),
});

export async function GET(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = db
    .select({
      id: recurringInvoices.id,
      clientId: recurringInvoices.clientId,
      name: recurringInvoices.name,
      frequency: recurringInvoices.frequency,
      dayOfMonth: recurringInvoices.dayOfMonth,
      nextDate: recurringInvoices.nextDate,
      direction: recurringInvoices.direction,
      items: recurringInvoices.items,
      notes: recurringInvoices.notes,
      active: recurringInvoices.active,
      lastGenerated: recurringInvoices.lastGenerated,
      createdAt: recurringInvoices.createdAt,
      clientName: clients.name,
      clientCompany: clients.companyName,
    })
    .from(recurringInvoices)
    .leftJoin(clients, eq(recurringInvoices.clientId, clients.id))
    .orderBy(desc(recurringInvoices.id))
    .all();

  const result = rows.map((r) => ({
    ...r,
    items: safeParseItems(r.items),
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = recurringSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = db
    .insert(recurringInvoices)
    .values({
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      frequency: parsed.data.frequency,
      dayOfMonth: parsed.data.dayOfMonth,
      nextDate: parsed.data.nextDate,
      direction: parsed.data.direction,
      items: JSON.stringify(parsed.data.items),
      notes: parsed.data.notes || null,
      active: parsed.data.active,
    })
    .returning()
    .get();

  return NextResponse.json({ ...created, items: parsed.data.items }, { status: 201 });
}

function safeParseItems(raw: string): any[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
