// Чисти изчислителни функции (без DB/IO) — лесни за unit тестване.

export interface InvoiceItem {
  quantity: number;
  price: number;
  vatRate?: number;
}

/**
 * Изчислява сумите на фактура: междинна сума, отстъпка, ДДС и общо.
 * Цените са без ДДС; отстъпката намалява основата пропорционално на всички редове.
 * ДДС се смята по ставки (чл. 114 ЗДДС — размер на данъка по всяка ставка):
 * byRate = [{ rate, base, vat }], vatAmount = сбор от закръгленото ДДС по ставки.
 */
export function calcInvoiceTotals(
  items: InvoiceItem[],
  discountPercent = 0,
  discountAmount = 0,
) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const discountTotal = (subtotal * discountPercent) / 100 + discountAmount;
  const netBase = subtotal - discountTotal;
  const factor = subtotal > 0 ? netBase / subtotal : 0;

  const bases = new Map<number, number>();
  for (const i of items) {
    const rate = i.vatRate ?? 20;
    bases.set(rate, (bases.get(rate) || 0) + i.quantity * i.price);
  }
  const byRate = [...bases.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rate, gross]) => {
      const base = roundMoney(gross * factor);
      return { rate, base, vat: roundMoney((base * rate) / 100) };
    });

  const vatAmount = roundMoney(byRate.reduce((s, r) => s + r.vat, 0));
  const total = roundMoney(roundMoney(netBase) + vatAmount);
  return {
    subtotal: roundMoney(subtotal),
    discountTotal: roundMoney(discountTotal),
    netBase: roundMoney(netBase),
    vatAmount,
    effRate: netBase > 0 ? vatAmount / netBase : 0,
    total,
    byRate,
  };
}

/** Закръгляне до стотинка (избягва 0.1+0.2 артефакти). */
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Изнесени в dates.ts; тук остават за съвместимост
export { addDays, addMonths } from "@/lib/dates";
import { addDays, addMonths } from "@/lib/dates";

export function nextRecurringDate(
  current: string,
  frequency: "monthly" | "weekly",
): string {
  return frequency === "weekly" ? addDays(current, 7) : addMonths(current, 1);
}

// Изходящи: серия Inv-NNNNNNNNNN (10 цифри по ЗДДС), започва от 1000000001.
// Старите номера (ИЗХ-…) не участват — новата серия върви сама.
export const OUTGOING_PREFIX = "Inv-";
export const OUTGOING_START = 1000000001;

/**
 * Следващ номер на фактура от съществуващите (MAX + 1, без колизии след изтриване).
 * Изходящи: Inv-1000000001, Inv-1000000002…; входящи (вътрешен регистър): ВХ-000001…
 */
export function nextInvoiceNumber(
  direction: "outgoing" | "incoming",
  existingNumbers: string[],
): string {
  if (direction === "outgoing") {
    let max = OUTGOING_START - 1;
    for (const n of existingNumbers) {
      const m = n?.match(/^Inv-(\d{10})$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `${OUTGOING_PREFIX}${max + 1}`;
  }
  let maxNum = 0;
  for (const n of existingNumbers) {
    const m = n?.match(/(\d+)$/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
  }
  return `ВХ-${String(maxNum + 1).padStart(6, "0")}`;
}

/** Форматира сума в евро (bg-BG локал). */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
