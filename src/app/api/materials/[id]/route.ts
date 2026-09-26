import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { materials, materialDeliveries, actMaterials, pourings, sites } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { firstZodError } from "@/lib/acts";

export const dynamic = "force-dynamic";

// Наличността не се пипа оттук — само през движенията (приход/разход) и актовете
const patchSchema = z
  .object({
    name: z.string().trim().min(1, "Името е задължително"),
    unit: z.string().trim().min(1, "Мерната единица е задължителна"),
    minThreshold: z.coerce.number({ invalid_type_error: "Невалиден праг" }).min(0, "Невалиден праг"),
    pricePerUnit: z.coerce.number({ invalid_type_error: "Невалидна цена" }).min(0, "Невалидна цена").nullable(),
    notes: z.string().nullable(),
  })
  .partial()
  .strict();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  const result = db.select().from(materials).where(eq(materials.id, id)).get();
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Изразходено по актове — за пълна история на движенията
  const usage = db
    .select({
      pouringId: actMaterials.pouringId,
      quantity: actMaterials.quantity,
      date: pourings.date,
      siteName: sites.name,
    })
    .from(actMaterials)
    .innerJoin(pourings, eq(actMaterials.pouringId, pourings.id))
    .leftJoin(sites, eq(pourings.siteId, sites.id))
    .where(eq(actMaterials.materialId, id))
    .orderBy(desc(pourings.date))
    .all();

  return NextResponse.json({ ...result, usage });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const unknown = parsed.error.issues.find((i) => i.code === "unrecognized_keys");
    const msg = unknown ? "Наличността се променя само с приход/разход" : firstZodError(parsed.error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const result = db
    .update(materials)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(materials.id, id))
    .returning()
    .get();
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  // Материал, ползван в актове, не се трие — иначе изчезва от историческите актове и разходи
  const used = db.select({ id: actMaterials.id }).from(actMaterials).where(eq(actMaterials.materialId, id)).limit(1).get();
  if (used) {
    return NextResponse.json({ error: "Материалът е ползван в актове и не може да се изтрие" }, { status: 409 });
  }

  db.transaction((tx) => {
    tx.delete(materialDeliveries).where(eq(materialDeliveries.materialId, id)).run();
    tx.delete(materials).where(eq(materials.id, id)).run();
  });
  return NextResponse.json({ message: "Изтрито" });
}
