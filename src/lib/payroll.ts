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

/** Месечна ведомост: сумира по работник, като всяка явка се смята със своите ставки. */
export function payrollSummary(entries: {
  workerId: number; workerName?: string | null; hours: number | null; overtime: number | null; advance: number | null;
  dailyRate: number | null; overtimeRate: number | null;
}[]) {
  const by = new Map<number, { workerId: number; name: string; days: number; hours: number; overtime: number; base: number; overtimePay: number; advance: number; gross: number; net: number }>();
  for (const e of entries) {
    const pay = calcPay({ hours: e.hours || 0, overtime: e.overtime || 0, advance: e.advance || 0, dailyRate: e.dailyRate, overtimeRate: e.overtimeRate });
    const s = by.get(e.workerId) || { workerId: e.workerId, name: e.workerName || "?", days: 0, hours: 0, overtime: 0, base: 0, overtimePay: 0, advance: 0, gross: 0, net: 0 };
    s.days += pay.days; s.hours += e.hours || 0; s.overtime += e.overtime || 0;
    s.base = roundMoney(s.base + pay.base); s.overtimePay = roundMoney(s.overtimePay + pay.overtimePay);
    s.advance = roundMoney(s.advance + (e.advance || 0)); s.gross = roundMoney(s.gross + pay.gross); s.net = roundMoney(s.gross - s.advance);
    by.set(e.workerId, s);
  }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name, "bg"));
}

/**
 * Явки от актовете: по работник и ден часовете се сумират; над 8 ч отиват като извънредни.
 * Обектът е този от акта с най-много часове за деня.
 */
export function attendanceFromActs(rows: { workerId: number; date: string; siteId: number; hours: number }[]) {
  const by = new Map<string, { workerId: number; date: string; hours: number; sites: Map<number, number> }>();
  for (const r of rows) {
    const k = `${r.workerId}|${r.date}`;
    const e = by.get(k) || { workerId: r.workerId, date: r.date, hours: 0, sites: new Map() };
    e.hours += r.hours || 0;
    e.sites.set(r.siteId, (e.sites.get(r.siteId) || 0) + (r.hours || 0));
    by.set(k, e);
  }
  return [...by.values()].map((e) => {
    const siteId = [...e.sites.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const hours = Math.min(e.hours, WORKDAY_HOURS);
    return { workerId: e.workerId, date: e.date, siteId, hours, overtime: Math.max(0, Math.round((e.hours - hours) * 100) / 100) };
  });
}
