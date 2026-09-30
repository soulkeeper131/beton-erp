import { rawDb } from "@/db";

// Одит лог. Ползва общата връзка към базата (WAL + busy timeout) — преди всяко
// записване отваряше нова връзка без timeout и при натоварване тихо губеше записи.
export function auditLog(params: {
  userId?: number | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "SEND";
  entityType: string;
  entityId?: number | null;
  changes?: Record<string, any> | null;
}) {
  try {
    rawDb.prepare(`
      INSERT INTO audit_log (user_id, action, entity_type, entity_id, changes)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      params.userId || null,
      params.action,
      params.entityType,
      params.entityId || null,
      params.changes ? JSON.stringify(params.changes) : null
    );
  } catch (e) {
    // Одитът никога не трябва да чупи основната операция
    console.error("Audit log error:", e);
  }
}
