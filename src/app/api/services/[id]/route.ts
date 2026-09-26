import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { services, offerItems, serviceItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
  if (!result.length) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  // Само позволени полета (преди — произволни, вкл. id)
  const update: Record<string, any> = {};
  for (const k of ["name", "description", "category", "unit", "basePrice", "active"]) {
    if (body?.[k] !== undefined) update[k] = body[k];
  }
  if (update.name !== undefined && !String(update.name).trim()) {
    return NextResponse.json({ error: "Името е задължително" }, { status: 400 });
  }
  const result = await db.update(services).set(update).where(eq(services.id, id)).returning();
  if (!result.length) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  // Ползвана в оферти услуга не се трие (FK → 500) — деактивира се и изчезва от новите оферти
  const used = db.select({ id: offerItems.id }).from(offerItems).where(eq(offerItems.serviceId, id)).limit(1).get();
  if (used) {
    db.update(services).set({ active: false }).where(eq(services.id, id)).run();
    return NextResponse.json({ message: "Услугата се ползва в оферти — деактивирана е" });
  }
  db.transaction((tx) => {
    tx.delete(serviceItems).where(eq(serviceItems.serviceId, id)).run();
    tx.delete(services).where(eq(services.id, id)).run();
  });
  return NextResponse.json({ message: "Изтрито" });
}
