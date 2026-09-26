import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { materials, materialDeliveries } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Приход (quantity > 0) / Разход (quantity < 0) за даден материал
const deliverySchema = z.object({
  quantity: z.coerce.number().refine((v) => v !== 0, "Количеството не може да е 0"),
  date: z.string().min(1, "Датата е задължителна"),
  supplier: z.string().optional().nullable(),
  price: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const materialId = parseInt(params.id);
  const result = db
    .select()
    .from(materialDeliveries)
    .where(eq(materialDeliveries.materialId, materialId))
    .orderBy(desc(materialDeliveries.date))
    .all();
  return NextResponse.json(result);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const materialId = parseInt(params.id);
  const body = await req.json();
  const parsed = deliverySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const material = db.select().from(materials).where(eq(materials.id, materialId)).get();
  if (!material) return NextResponse.json({ error: "Материалът не е намерен" }, { status: 404 });

  const isIncoming = parsed.data.quantity > 0;
  const unitPrice = parsed.data.price ?? null;

  const { delivery, newQuantity } = db.transaction((tx) => {
    const [d] = tx
      .insert(materialDeliveries)
      .values({
        materialId,
        date: parsed.data.date,
        quantity: parsed.data.quantity,
        supplier: parsed.data.supplier || null,
        price: parsed.data.price || null,
        notes: parsed.data.notes || null,
      })
      .returning()
      .all();
    // Атомарно спрямо текущата наличност (без read-modify-write състезание).
    // Последната доставна цена става цена на материала — по нея се смятат разходите в актовете.
    const updated = tx
      .update(materials)
      .set({
        quantity: sql`${materials.quantity} + ${parsed.data.quantity}`,
        ...(isIncoming && unitPrice != null ? { pricePerUnit: unitPrice } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(materials.id, materialId))
      .returning({ quantity: materials.quantity })
      .get();
    return { delivery: d, newQuantity: updated?.quantity ?? 0 };
  });

  return NextResponse.json({ ...delivery, newQuantity }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const materialId = parseInt(params.id);
  const { searchParams } = new URL(req.url);
  const deliveryId = parseInt(searchParams.get("deliveryId") || "");
  if (isNaN(deliveryId)) return NextResponse.json({ error: "deliveryId е задължителен" }, { status: 400 });

  const delivery = db.select().from(materialDeliveries).where(eq(materialDeliveries.id, deliveryId)).get();
  // Движението трябва да е на този материал — иначе коригираме грешната наличност
  if (!delivery || delivery.materialId !== materialId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.transaction((tx) => {
    tx.delete(materialDeliveries).where(eq(materialDeliveries.id, deliveryId)).run();
    tx.update(materials)
      .set({ quantity: sql`${materials.quantity} - ${delivery.quantity}` })
      .where(eq(materials.id, materialId))
      .run();
  });

  return NextResponse.json({ success: true });
}
