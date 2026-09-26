import { z } from "zod";

// Валидация и помощна логика за актове (pourings). Чисти функции — тестват се без DB.

const id = z.coerce.number({ invalid_type_error: "Изберете стойност" }).int().positive("Изберете стойност");

export const actItemSchema = z.object({
  concreteTypeId: id,
  quantityM3: z.coerce.number({ invalid_type_error: "Въведете число" }).positive("Количеството трябва да е > 0"),
  pricePerM3: z.coerce.number({ invalid_type_error: "Въведете число" }).min(0, "Цената не може да е отрицателна"),
});

export const actWorkerSchema = z.object({
  workerId: id,
  hours: z.coerce.number({ invalid_type_error: "Въведете число" }).positive("Часовете трябва да са > 0"),
  rate: z.coerce.number({ invalid_type_error: "Въведете число" }).min(0, "Ставката не може да е отрицателна"),
});

export const actMaterialSchema = z.object({
  materialId: id,
  quantity: z.coerce.number({ invalid_type_error: "Въведете число" }).positive("Количеството трябва да е > 0"),
});

const optionalId = z.union([id, z.null()]).optional();

export const actCreateSchema = z.object({
  siteId: id,
  offerId: optionalId,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Невалидна дата"),
  machineId: optionalId,
  weather: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(actItemSchema).min(1, "Поне един ред е задължителен"),
});

export const actPatchSchema = actCreateSchema
  .extend({
    status: z.string().optional(),
    workers: z.array(actWorkerSchema).optional(),
    materials: z.array(actMaterialSchema).optional(),
  })
  .partial();

const LIST_LABELS: Record<string, string> = { items: "Ред", workers: "Работник", materials: "Материал" };
const FIELD_LABELS: Record<string, string> = { siteId: "Обект", offerId: "Оферта", machineId: "Машина", date: "Дата" };

/** Първото съобщение за грешка от zod — за показване на потребителя. */
export function firstZodError(err: z.ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Невалидни данни";
  // items.0.quantityM3 → "Ред 1"; siteId → "Обект"
  const [head, idx] = issue.path;
  const label =
    typeof idx === "number"
      ? `${LIST_LABELS[String(head)] || String(head)} ${idx + 1}`
      : FIELD_LABELS[String(head)] || "";
  return label ? `${label}: ${issue.message}` : issue.message;
}

/**
 * Разлика в изразходените материали между старото и новото състояние на акта.
 * Връща { materialId → с колко да се намали наличността } (отрицателно = връщане в склада).
 */
export function materialStockDelta(
  before: { materialId: number; quantity: number }[],
  after: { materialId: number; quantity: number }[],
): Map<number, number> {
  const delta = new Map<number, number>();
  for (const m of after) delta.set(m.materialId, (delta.get(m.materialId) || 0) + m.quantity);
  for (const m of before) delta.set(m.materialId, (delta.get(m.materialId) || 0) - m.quantity);
  for (const [k, v] of delta) if (Math.abs(v) < 1e-9) delta.delete(k);
  return delta;
}

/** Часова ставка по подразбиране от дневната (8-часов работен ден). */
export function hourlyFromDaily(dailyRate: number | null | undefined): number {
  return Math.round(((dailyRate || 0) / 8) * 100) / 100;
}
