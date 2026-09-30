// Дати без часови зони. Бизнес денят е по София: преди „днес“ се смяташе по UTC
// (new Date().toISOString()), т.е. между 00:00 и 03:00 българско време беше вчера.
// Работи и в браузъра, и на сървъра.

export const BUSINESS_TZ = "Europe/Sofia";

const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** Датата (YYYY-MM-DD) на даден момент по българско време. */
export function sofiaDate(d: Date = new Date()): string {
  return ymd.format(d);
}

/** Днешната дата по българско време. */
export function today(): string {
  return sofiaDate();
}

function parse(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD + n дни (смятано в UTC — не зависи от зоната на сървъра). */
export function addDays(date: string, days: number): string {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}

/** Последният ден на месеца (m = 1..12). */
export function monthEnd(y: number, m: number): string {
  return fmt(new Date(Date.UTC(y, m, 0)));
}

/** YYYY-MM-DD + n месеца; 31 ян + 1 → 28/29 фев. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return fmt(first);
}

/** Колко дни остават до датата (0 = днес, отрицателно = минала), по българско време. */
export function daysUntil(date: string): number {
  return Math.round((parse(date.slice(0, 10)).getTime() - parse(today()).getTime()) / 86400000);
}
