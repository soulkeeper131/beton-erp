import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { concreteTypes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  className: z.string().optional().nullable(),
  pricePerM3: z.number().min(0).optional(),
  description: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ct = await db
    .select()
    .from(concreteTypes)
    .where(eq(concreteTypes.id, parseInt(params.id)))
    .get();

  if (!ct) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ct);
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
    .from(concreteTypes)
    .where(eq(concreteTypes.id, parseInt(params.id)))
    .get();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db
    .update(concreteTypes)
    .set(parsed.data)
    .where(eq(concreteTypes.id, parseInt(params.id)))
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

  // Soft delete: set active = false
  const [updated] = await db
    .update(concreteTypes)
    .set({ active: false })
    .where(eq(concreteTypes.id, parseInt(params.id)))
    .returning()
    .all();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
