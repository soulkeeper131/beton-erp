import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import path from "path";
// Импортирането изпълнява inline миграциите + seed в db/index.ts
import "@/db";

describe("DB schema (smoke)", () => {
  const db = new Database(path.resolve("data/sqlite.db"), { readonly: true });

  it("всички очаквани таблици съществуват", () => {
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const tables = new Set(rows.map((r) => r.name));

    const expected = [
      "users", "clients", "concrete_types", "sites", "machines", "machine_maintenance",
      "workers", "worker_attendance", "materials", "material_deliveries",
      "offers", "offer_items", "pourings", "pouring_items", "act_workers", "act_materials",
      "act_photos", "invoices", "invoice_items", "site_calendar", "templates",
      "audit_log", "api_keys", "services", "service_items", "company_settings",
      "chat_sessions", "chat_messages", "notifications", "recurring_invoices",
    ];
    for (const t of expected) {
      expect(tables.has(t), `липсва таблица: ${t}`).toBe(true);
    }
  });

  it("seed създава потребители и типове бетон", () => {
    const users = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
    const types = db.prepare("SELECT COUNT(*) as c FROM concrete_types").get() as { c: number };
    expect(users.c).toBeGreaterThanOrEqual(1);
    expect(types.c).toBeGreaterThanOrEqual(1);
  });

  it("company_settings има един ред", () => {
    const settings = db.prepare("SELECT COUNT(*) as c FROM company_settings").get() as { c: number };
    expect(settings.c).toBe(1);
  });

  it("notifications и recurring_invoices таблиците съществуват (нови P1 модули)", () => {
    const cols = db.prepare("PRAGMA table_info(notifications)").all() as { name: string }[];
    const colNames = new Set(cols.map((c) => c.name));
    expect(colNames.has("type")).toBe(true);
    expect(colNames.has("is_read")).toBe(true);
  });
});
