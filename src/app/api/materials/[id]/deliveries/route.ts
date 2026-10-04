import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { materials, materialDeliveries } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { remainingAfter, weightedAverageCost } from "@/lib/stock";

export const dynamic = "force-dynamic";

// Приход (quantity > 0) / Разход (quantity < 0) за даден материал
const deliverySchema = z.object({
  quantity: z.coerce.number({ invalid_type_error: "Въведете количество" }).refine((v) => v !== 0, "Количеството не може да е 0"),
  date: z.string({ required_error: "Датата е задължителна" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Невалидна дата"),
  supplier: z.string().optional().nullable(),
  price: z.preprocess((v) => (v === "" ? null : v), z.coerce.number({ invalid_type_error: "Невалидна цена" }).min(0, "Цената не може да е отрицателна").optional().nullable()),
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
  const parsed = deliverySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Невалидни данни" }, { status: 400 });

  const material = db.select().from(materials).where(eq(materials.id, materialId)).get();
  if (!material) return NextResponse.json({ error: "Материалът не е намерен" }, { status: 404 });

  const isIncoming = parsed.data.quantity > 0;
  const unitPrice = parsed.data.price ?? null;
  // Ръчен разход не може да изкара наличността на минус (актовете само предупреждават)
  if (!isIncoming && remainingAfter(material.quantity, -parsed.data.quantity) < 0) {
    return NextResponse.json({ error: `Недостатъчна наличност: има ${material.quantity} ${material.unit}` }, { status: 409 });
  }

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
    // Цената на склада е средна претеглена (по нея се изписва в актовете); наличността —
    // атомарно спрямо текущата (без read-modify-write състезание)
    const cur = tx.select({ quantity: materials.quantity, pricePerUnit: materials.pricePerUnit }).from(materials).where(eq(materials.id, materialId)).get()!;
    const updated = tx
      .update(materials)
      .set({
        quantity: sql`${materials.quantity} + ${parsed.data.quantity}`,
        ...(isIncoming && unitPrice != null ? { pricePerUnit: weightedAverageCost(cur.quantity, cur.pricePerUnit, parsed.data.quantity, unitPrice) } : {}),
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

  // Изтрит приход, който вече е изразходван, би оставил отрицателна наличност
  const material = db.select({ quantity: materials.quantity, unit: materials.unit }).from(materials).where(eq(materials.id, materialId)).get();
  if (material && delivery.quantity > 0 && remainingAfter(material.quantity, delivery.quantity) < 0) {
    return NextResponse.json({ error: `Приходът е вече изразходван (наличност ${material.quantity} ${material.unit}) — изтриването ще направи наличността отрицателна. Запишете корекция с разход.` }, { status: 409 });
  }

  db.transaction((tx) => {
    tx.delete(materialDeliveries).where(eq(materialDeliveries.id, deliveryId)).run();
    tx.update(materials)
      .set({ quantity: sql`${materials.quantity} - ${delivery.quantity}` })
      .where(eq(materials.id, materialId))
      .run();
  });

  return NextResponse.json({ success: true });
}
