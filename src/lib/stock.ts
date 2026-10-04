import { roundMoney } from "@/lib/calc";

// Склад — чисти функции.

/**
 * Средна претеглена цена след приход: (наличност × стара цена + количество × нова цена) / общо.
 * Преди новата доставка просто заменяше цената — и всички стари актове „поскъпваха“.
 */
export function weightedAverageCost(
  stock: number,
  oldPrice: number | null | undefined,
  qty: number,
  price: number | null | undefined,
): number | null {
  if (price == null) return oldPrice ?? null;
  if (oldPrice == null || stock <= 0) return roundCost(price);
  const total = stock + qty;
  if (total <= 0) return roundCost(price);
  return roundCost((stock * oldPrice + qty * price) / total);
}

/** До 4 знака — цени на кг/бр. могат да са под стотинка. */
export function roundCost(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

export const stockValue = (qty: number, price: number | null | undefined) => roundMoney(Math.max(0, qty) * (price || 0));

/** Колко ще остане след разход; отрицателно = недостиг. Толеранс за закръгляне. */
export function remainingAfter(stock: number, out: number): number {
  const r = stock - out;
  return Math.abs(r) < 1e-9 ? 0 : r;
}
