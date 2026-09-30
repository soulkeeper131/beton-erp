import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { generateKey, hashKey, resolveApiKey } from "@/lib/api-keys";

const req = (key?: string) =>
  new Request("http://x/api/tools/call", { headers: key === undefined ? {} : { authorization: `Bearer ${key}` } });

describe("API ключове", () => {
  const key = generateKey();
  const row = db.insert(apiKeys).values({ name: "test-" + Date.now(), key: hashKey(key) }).returning().get();
  afterAll(() => { db.delete(apiKeys).where(eq(apiKeys.id, row.id)).run(); });

  it("в базата се пази хеш, не ключът", () => {
    expect(row.key).not.toContain(key);
    expect(row.key).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("ключ от базата → права на мениджър", () => {
    expect(resolveApiKey(req(key))).toMatchObject({ kind: "db", role: "manager" });
  });

  it("спрян или непознат ключ → отказ", () => {
    db.update(apiKeys).set({ active: false }).where(eq(apiKeys.id, row.id)).run();
    expect(resolveApiKey(req(key))).toBeNull();
    db.update(apiKeys).set({ active: true }).where(eq(apiKeys.id, row.id)).run();
    expect(resolveApiKey(req("bk_wrong"))).toBeNull();
    expect(resolveApiKey(req(""))).toBeNull();
    expect(resolveApiKey(req())).toBeNull();
  });

  it("API_KEY от средата → администратор", () => {
    const prev = process.env.API_KEY;
    process.env.API_KEY = "env-secret-key";
    try {
      expect(resolveApiKey(req("env-secret-key"))).toMatchObject({ kind: "env", role: "admin" });
    } finally {
      process.env.API_KEY = prev;
    }
  });
});
