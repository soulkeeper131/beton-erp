import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { adminGate } from "@/lib/auth-helpers";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { generateKey, hashKey } from "@/lib/api-keys";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await adminGate(req, "Само администратор управлява API ключовете");
  if ("denied" in a) return a.denied;
  // Самият ключ (хеш) не се връща
  const rows = db.select({ id: apiKeys.id, name: apiKeys.name, active: apiKeys.active, createdAt: apiKeys.createdAt })
    .from(apiKeys).orderBy(desc(apiKeys.id)).all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const a = await adminGate(req, "Само администратор управлява API ключовете");
  if ("denied" in a) return a.denied;
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) return NextResponse.json({ error: "Въведете име на ключа (до 100 знака)" }, { status: 400 });
  const key = generateKey();
  const row = db.insert(apiKeys).values({ name, key: hashKey(key) }).returning({ id: apiKeys.id }).get();
  auditLog({ userId: a.userId, action: "CREATE", entityType: "api_key", entityId: row.id, changes: { name } });
  // Ключът се показва само сега
  return NextResponse.json({ id: row.id, name, key }, { status: 201 });
}
