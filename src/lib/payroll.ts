import { z } from "zod";
import { roundMoney } from "@/lib/calc";

// Ведомост: дневната ставка е за 8-часов ден; извънредните са €/ч
// (ако няма зададена ставка — часовата × 1.5).
export const WORKDAY_HOURS = 8;

export function calcPay(p: {
  hours: number;
  overtime: number;
  advance: number;
  dailyRate: number | null | undefined;
  overtimeRate?: number | null;
}) {
  const hourly = (p.dailyRate || 0) / WORKDAY_HOURS;
  const otRate = p.overtimeRate ?? hourly * 1.5;
  const base = roundMoney(p.hours * hourly);
  const overtimePay = roundMoney(p.overtime * otRate);
  const gross = roundMoney(base + overtimePay);
  return { days: p.hours / WORKDAY_HOURS, base, overtimePay, gross, net: roundMoney(gross - p.advance) };
}

const money = (msg: string) => z.coerce.number({ invalid_type_error: msg }).min(0, msg);
const optMoney = z
  .union([z.literal(""), z.null(), money("Невалидна сума")])
  .optional()
  .transform((v) => (v === "" || v == null ? null : Number(v)));

export const workerSchema = z.object({
  name: z.string({ required_error: "Името е задължително" }).trim().min(1, "Името е задължително"),
  phone: z.string().optional().nullable().transform((v) => v || null),
  dailyRate: z.coerce.number({ invalid_type_error: "Въведете дневна ставка", required_error: "Въведете дневна ставка" }).positive("Дневната ставка трябва да е > 0"),
  overtimeRate: optMoney,
  status: z.enum(["active", "inactive"]).optional(),
  hireDate: z.string().optional().nullable().transform((v) => v || null),
  notes: z.string().optional().nullable().transform((v) => v || null),
});

export const attendanceSchema = z.object({
  workerId: z.coerce.number({ invalid_type_error: "Изберете работник" }).int().positive("Изберете работник"),
  date: z.string({ required_error: "Датата е задължителна" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Невалидна дата"),
  siteId: z.coerce.number().int().positive().optional().nullable(),
  hours: z.coerce.number({ invalid_type_error: "Невалидни часове" }).min(0, "Невалидни часове").max(24, "Часовете не може да са над 24").default(8),
  overtime: z.coerce.number({ invalid_type_error: "Невалидни часове" }).min(0).max(16, "Твърде много извънредни часове").default(0),
  advance: z.coerce.number({ invalid_type_error: "Невалиден аванс" }).min(0, "Невалиден аванс").default(0),
  notes: z.string().optional().nullable(),
});
