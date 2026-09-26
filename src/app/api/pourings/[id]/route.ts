import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import {
  pourings, pouringItems, sites, offers, concreteTypes, machines,
  actWorkers, actMaterials, actPhotos, workers, materials,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { actPatchSchema, firstZodError, materialStockDelta } from "@/lib/acts";
import { applyStockDelta, checkActRefs } from "@/lib/acts-db";
import { roundMoney } from "@/lib/calc";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  const result = await db.select({
    id: pourings.id,
    date: pourings.date,
    status: pourings.status,
    weather: pourings.weather,
    notes: pourings.notes,
    actPdfPath: pourings.actPdfPath,
    siteId: pourings.siteId,
    offerId: pourings.offerId,
    machineId: pourings.machineId,
    site: { id: sites.id, name: sites.name },
    offer: { id: offers.id, number: offers.number },
    machine: { id: machines.id, name: machines.name },
  })
    .from(pourings)
    .leftJoin(sites, eq(pourings.siteId, sites.id))
    .leftJoin(offers, eq(pourings.offerId, offers.id))
    .leftJoin(machines, eq(pourings.machineId, machines.id))
    .where(eq(pourings.id, id))
    .limit(1);

  if (!result.length) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });

  const pouring = result[0] as any;

  const items = await db.select({
    id: pouringItems.id,
    concreteTypeId: pouringItems.concreteTypeId,
    quantityM3: pouringItems.quantityM3,
    pricePerM3: pouringItems.pricePerM3,
    total: pouringItems.total,
    concreteTypeName: concreteTypes.name,
    concreteTypePrice: concreteTypes.pricePerM3,
  })
    .from(pouringItems)
    .leftJoin(concreteTypes, eq(pouringItems.concreteTypeId, concreteTypes.id))
    .where(eq(pouringItems.pouringId, id))
    .orderBy(asc(pouringItems.sortOrder))
    .all();

  const pouringWorkers = db.select({
    id: actWorkers.id,
    workerId: actWorkers.workerId,
    hours: actWorkers.hours,
    rate: actWorkers.rate,
    total: actWorkers.total,
    workerName: workers.name,
  })
    .from(actWorkers)
    .leftJoin(workers, eq(actWorkers.workerId, workers.id))
    .where(eq(actWorkers.pouringId, id))
    .all();

  const pouringMaterials = db.select({
    id: actMaterials.id,
    materialId: actMaterials.materialId,
    quantity: actMaterials.quantity,
    materialName: materials.name,
    unit: materials.unit,
  })
    .from(actMaterials)
    .leftJoin(materials, eq(actMaterials.materialId, materials.id))
    .where(eq(actMaterials.pouringId, id))
    .all();

  pouring.items = items;
  pouring.workers = pouringWorkers;
  pouring.materials = pouringMaterials;
  pouring.quantityM3 = items.reduce((s: number, i: any) => s + (i.quantityM3 || 0), 0);
  pouring.total = items.reduce((s: number, i: any) => s + (i.total || 0), 0);

  return NextResponse.json(pouring);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  const current = db.select({ siteId: pourings.siteId, offerId: pourings.offerId }).from(pourings).where(eq(pourings.id, id)).get();
  if (!current) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });

  const parsed = actPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  const body = parsed.data;

  if (body.siteId !== undefined || body.offerId !== undefined) {
    const refError = checkActRefs(body.siteId ?? current.siteId, body.offerId !== undefined ? body.offerId ?? null : current.offerId);
    if (refError) return NextResponse.json({ error: refError }, { status: 400 });
  }

  const update: Record<string, any> = {};
  for (const key of ["siteId", "offerId", "date", "machineId", "weather", "notes", "status"] as const) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  // Всичко в една транзакция — при грешка актът остава непроменен
  db.transaction((tx) => {
    if (body.items) {
      tx.delete(pouringItems).where(eq(pouringItems.pouringId, id)).run();
      body.items.forEach((item, i) => {
        tx.insert(pouringItems).values({
          pouringId: id,
          concreteTypeId: item.concreteTypeId,
          quantityM3: item.quantityM3,
          pricePerM3: item.pricePerM3,
          total: roundMoney(item.quantityM3 * item.pricePerM3),
          sortOrder: i,
        }).run();
      });
      update.quantityM3 = body.items.reduce((s, i) => s + i.quantityM3, 0);
      update.concreteTypeId = body.items[0]?.concreteTypeId ?? null;
    }

    if (body.workers) {
      tx.delete(actWorkers).where(eq(actWorkers.pouringId, id)).run();
      for (const w of body.workers) {
        tx.insert(actWorkers).values({
          pouringId: id,
          workerId: w.workerId,
          hours: w.hours,
          rate: w.rate,
          total: roundMoney(w.hours * w.rate),
        }).run();
      }
    }

    if (body.materials) {
      // Складът следва акта: изписва се разликата спрямо предишното състояние
      const before = tx.select({ materialId: actMaterials.materialId, quantity: actMaterials.quantity })
        .from(actMaterials).where(eq(actMaterials.pouringId, id)).all();
      tx.delete(actMaterials).where(eq(actMaterials.pouringId, id)).run();
      for (const m of body.materials) {
        tx.insert(actMaterials).values({ pouringId: id, materialId: m.materialId, quantity: m.quantity }).run();
      }
      applyStockDelta(tx, materialStockDelta(before, body.materials));
    }

    if (Object.keys(update).length > 0) {
      tx.update(pourings).set(update).where(eq(pourings.id, id)).run();
    }
  });

  return GET(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });

  db.transaction((tx) => {
    // Изразходените материали се връщат в склада
    const used = tx.select({ materialId: actMaterials.materialId, quantity: actMaterials.quantity })
      .from(actMaterials).where(eq(actMaterials.pouringId, id)).all();
    applyStockDelta(tx, materialStockDelta(used, []));

    tx.delete(pouringItems).where(eq(pouringItems.pouringId, id)).run();
    tx.delete(actWorkers).where(eq(actWorkers.pouringId, id)).run();
    tx.delete(actMaterials).where(eq(actMaterials.pouringId, id)).run();
    tx.delete(actPhotos).where(eq(actPhotos.pouringId, id)).run();
    tx.delete(pourings).where(eq(pourings.id, id)).run();
  });
  return NextResponse.json({ message: "Изтрито" });
}
