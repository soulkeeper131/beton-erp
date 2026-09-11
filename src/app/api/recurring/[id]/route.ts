import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { recurringInvoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  description: z.string().min(1),
  unit: z.string().default("бр."),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).default(20),
});

const updateSchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  name: z.string().min(1).optional(),
  frequency: z.enum(["monthly", "weekly"]).optional(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  nextDate: z.string().min(1).optional(),
  direction: z.enum(["outgoing", "incoming"]).optional(),
  items: z.array(itemSchema).min(1).optional(),
  notes: z.string().optional().nullable(),
  active: z.coerce.boolean().optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = db.select().from(recurringInvoices).where(eq(recurringInvoices.id, parseInt(params.id))).get();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ...row, items: safeParseItems(row.items) });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const values: Record<string, any> = {};
  if (parsed.data.clientId !== undefined) values.clientId = parsed.data.clientId;
  if (parsed.data.name !== undefined) values.name = parsed.data.name;
  if (parsed.data.frequency !== undefined) values.frequency = parsed.data.frequency;
  if (parsed.data.dayOfMonth !== undefined) values.dayOfMonth = parsed.data.dayOfMonth;
  if (parsed.data.nextDate !== undefined) values.nextDate = parsed.data.nextDate;
  if (parsed.data.direction !== undefined) values.direction = parsed.data.direction;
  if (parsed.data.items !== undefined) values.items = JSON.stringify(parsed.data.items);
  if (parsed.data.notes !== undefined) values.notes = parsed.data.notes;
  if (parsed.data.active !== undefined) values.active = parsed.data.active;

  const updated = db
    .update(recurringInvoices)
    .set(values)
    .where(eq(recurringInvoices.id, parseInt(params.id)))
    .returning()
    .get();

  return NextResponse.json({ ...updated, items: values.items ? safeParseItems(values.items) : undefined });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.delete(recurringInvoices).where(eq(recurringInvoices.id, parseInt(params.id)));
  return NextResponse.json({ ok: true });
}

function safeParseItems(raw: string): any[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
