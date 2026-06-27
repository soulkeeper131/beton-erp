import Database from "better-sqlite3";
import path from "path";

export function auditLog(params: {
  userId?: number | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  entityId?: number | null;
  changes?: Record<string, any> | null;
}) {
  try {
    const dbPath = path.join(process.cwd(), "data", "sqlite.db");
    const db = new Database(dbPath);
    db.prepare(`
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, changes)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      params.userId || null,
      params.action,
      params.entityType,
      params.entityId || null,
      params.changes ? JSON.stringify(params.changes) : null
    );
    db.close();
  } catch (e) {
    // Silently fail — audit should never break the app
    console.error("Audit log error:", e);
  }
}
