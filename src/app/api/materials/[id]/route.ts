import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { materials, materialDeliveries, actMaterials } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  const result = db.select().from(materials).where(eq(materials.id, id)).get();
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  const body = await request.json();
  const result = await db.update(materials).set(body).where(eq(materials.id, id)).returning();
  return NextResponse.json(result[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  // Каскадно изтриване на свързаните движения и актове, за да не чупи FK constraint
  db.delete(materialDeliveries).where(eq(materialDeliveries.materialId, id)).run();
  db.delete(actMaterials).where(eq(actMaterials.materialId, id)).run();
  db.delete(materials).where(eq(materials.id, id)).run();
  return NextResponse.json({ message: "Изтрито" });
}
