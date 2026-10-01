import { NextResponse } from "next/server";
import { adminGate, getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { concreteTypes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(1, "Името е задължително").optional(),
  className: z.string().optional().nullable(),
  pricePerM3: z.coerce.number({ invalid_type_error: "Въведете цена" }).min(0, "Цената не може да е отрицателна").optional(),
  description: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const a = await adminGate(req, "Само администратор променя типовете бетон");
  if ("denied" in a) return a.denied;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Невалидни данни" }, { status: 400 });
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
  const a = await adminGate(req, "Само администратор променя типовете бетон");
  if ("denied" in a) return a.denied;

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
