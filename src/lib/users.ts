import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";

export const ROLES = ["admin", "manager", "brigadir", "employee"] as const;
export const MIN_PASSWORD = 6;

export function validRole(role: unknown): role is (typeof ROLES)[number] {
  return typeof role === "string" && (ROLES as readonly string[]).includes(role);
}

/**
 * Проверка преди промяна/изтриване на потребител: да не остане системата без активен
 * админ и админът да не изтрие себе си. Връща съобщение за грешка или null.
 */
export function guardUserChange(
  targetId: number,
  change: { role?: string; active?: boolean; delete?: boolean },
  actorId?: number,
): string | null {
  if (change.delete && actorId === targetId) return "Не можете да изтриете собствения си акаунт";
  const target = db.select({ role: users.role, active: users.active }).from(users).where(eq(users.id, targetId)).get();
  if (!target || target.role !== "admin" || !target.active) return null;
  const losesAdmin = change.delete || change.active === false || (change.role !== undefined && change.role !== "admin");
  if (!losesAdmin) return null;
  const otherAdmin = db.select({ id: users.id }).from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true), ne(users.id, targetId))).get();
  return otherAdmin ? null : "Това е последният активен администратор — първо дайте админ права на друг потребител";
}
