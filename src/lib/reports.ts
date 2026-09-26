// Помощни функции за справките — чисти, без DB, за да се тестват лесно.

export type Period = { from: string | null; to: string | null };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Празни стойности = без граница. Невалиден формат или from > to → null.
export function parsePeriod(from: string | null, to: string | null): Period | null {
  const f = from?.trim() || null;
  const t = to?.trim() || null;
  if ((f && !DATE_RE.test(f)) || (t && !DATE_RE.test(t))) return null;
  if (f && t && f > t) return null;
  return { from: f, to: t };
}

// Датата може да е "YYYY-MM-DD" или с час — сравняваме само първите 10 символа.
export function inPeriod(date: string | null | undefined, period: Period): boolean {
  if (!period.from && !period.to) return true;
  if (!date) return false;
  const d = date.slice(0, 10);
  if (period.from && d < period.from) return false;
  if (period.to && d > period.to) return false;
  return true;
}

// Знак на документа в оборота: проформа не се брои, кредитно известие намалява.
export function invoiceSign(type: string | null | undefined): number {
  if (type === "proforma") return 0;
  if (type === "credit_note") return -1;
  return 1;
}

// CSV за Excel с български регионални настройки: ";" разделител, десетична запетая, BOM.
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = typeof v === "number" ? String(v).replace(".", ",") : v;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers, ...rows].map((r) => r.map(cell).join(";"));
  return "﻿" + lines.join("\r\n");
}
