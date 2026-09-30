import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { adminGate } from "@/lib/auth-helpers";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const MSG = "Само администратор управлява API ключовете";

// PATCH { active } — спиране/пускане на ключ
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await adminGate(req, MSG);
  if ("denied" in a) return a.denied;
  const id = parseInt(params.id);
  const body = await req.json().catch(() => ({}));
  if (typeof body.active !== "boolean") return NextResponse.json({ error: "Липсва active" }, { status: 400 });
  const row = db.update(apiKeys).set({ active: body.active }).where(eq(apiKeys.id, id))
    .returning({ id: apiKeys.id, name: apiKeys.name, active: apiKeys.active }).get();
  if (!row) return NextResponse.json({ error: "Ключът не е намерен" }, { status: 404 });
  auditLog({ userId: a.userId, action: "UPDATE", entityType: "api_key", entityId: id, changes: { active: body.active } });
  return NextResponse.json(row);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await adminGate(req, MSG);
  if ("denied" in a) return a.denied;
  const id = parseInt(params.id);
  const row = db.delete(apiKeys).where(eq(apiKeys.id, id)).returning({ name: apiKeys.name }).get();
  if (!row) return NextResponse.json({ error: "Ключът не е намерен" }, { status: 404 });
  auditLog({ userId: a.userId, action: "DELETE", entityType: "api_key", entityId: id, changes: { name: row.name } });
  return NextResponse.json({ ok: true });
}
