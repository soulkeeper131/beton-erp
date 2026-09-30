import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";

// Ключове за външни системи (AI клиенти през /api/tools/call). В базата се пази само
// SHA-256 — самият ключ се показва веднъж при създаване.

export const KEY_PREFIX = "bk_";

export function hashKey(key: string): string {
  return "sha256:" + createHash("sha256").update(key).digest("hex");
}

export function generateKey(): string {
  return KEY_PREFIX + randomBytes(24).toString("base64url");
}

export type Caller = { kind: "env" | "db"; role: "admin" | "manager"; name: string };

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Кой вика с този Bearer ключ. API_KEY от средата = пълен достъп (както навсякъде);
 * ключ от базата = права на мениджър (без потребители, настройки и backup).
 */
export function resolveApiKey(req: Request): Caller | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const key = h.slice(7).trim();
  if (!key) return null;
  const env = process.env.API_KEY || "";
  if (env && sameString(key, env)) return { kind: "env", role: "admin", name: "API_KEY" };
  // По хеш; стари ключове, въведени ръчно в базата, може да са некриптирани
  const row = db.select().from(apiKeys).where(or(eq(apiKeys.key, hashKey(key)), eq(apiKeys.key, key))).get();
  if (!row || !row.active) return null;
  return { kind: "db", role: "manager", name: row.name };
}
