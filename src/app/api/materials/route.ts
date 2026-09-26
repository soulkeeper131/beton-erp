import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { materials, materialDeliveries } from "@/db/schema";
import { firstZodError } from "@/lib/acts";

export const dynamic = "force-dynamic";

const num = (msg: string) => z.coerce.number({ invalid_type_error: msg }).min(0, msg);

const createSchema = z.object({
  name: z.string({ required_error: "Името е задължително" }).trim().min(1, "Името е задължително"),
  unit: z.string({ required_error: "Мерната единица е задължителна" }).trim().min(1, "Мерната единица е задължителна"),
  quantity: z.union([num("Невалидно количество"), z.literal("")]).optional(),
  minThreshold: z.union([num("Невалиден праг"), z.literal("")]).optional(),
  pricePerUnit: z.union([num("Невалидна цена"), z.literal("")]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const result = await db.select().from(materials).orderBy(materials.name);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  const d = parsed.data;
  const initial = Number(d.quantity || 0);

  const created = db.transaction((tx) => {
    const m = tx.insert(materials).values({
      name: d.name,
      unit: d.unit,
      quantity: initial,
      minThreshold: Number(d.minThreshold || 0),
      pricePerUnit: d.pricePerUnit === "" || d.pricePerUnit == null ? null : Number(d.pricePerUnit),
      notes: d.notes || null,
    }).returning().get();
    // Началната наличност влиза в историята, за да съвпада с движенията
    if (initial > 0) {
      tx.insert(materialDeliveries).values({
        materialId: m.id,
        date: new Date().toISOString().slice(0, 10),
        quantity: initial,
        notes: "Начална наличност",
      }).run();
    }
    return m;
  });

  return NextResponse.json(created, { status: 201 });
}
