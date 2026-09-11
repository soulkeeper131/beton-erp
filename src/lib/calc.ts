// Чисти изчислителни функции (без DB/IO) — лесни за unit тестване.

export interface InvoiceItem {
  quantity: number;
  price: number;
  vatRate?: number;
}

/**
 * Изчислява сумите на фактура: междинна сума, отстъпка, ДДС и общо.
 * Цените са без ДДС; ДДС се начислява върху данъчната основа (след отстъпка),
 * с пропорционална ефективна ставка при смесени ДДС ставки.
 */
export function calcInvoiceTotals(
  items: InvoiceItem[],
  discountPercent = 0,
  discountAmount = 0,
) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const discountTotal = (subtotal * discountPercent) / 100 + discountAmount;
  const netBase = subtotal - discountTotal;
  const vatOnFull = items.reduce(
    (s, i) => s + (i.quantity * i.price * (i.vatRate ?? 20)) / 100,
    0,
  );
  const effRate = subtotal > 0 ? vatOnFull / subtotal : 0;
  const vatAmount = netBase * effRate;
  const total = netBase + vatAmount;
  return { subtotal, discountTotal, netBase, vatAmount, effRate, total };
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function addMonths(date: string, months: number): string {
  const d = new Date(date + "T00:00:00");
  const day = d.getDate();
  d.setDate(1); // първи от текущия месец
  d.setMonth(d.getMonth() + months);
  // clamp към последния ден на целевия месец (напр. 31 ян → 28/29 фев)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d.toISOString().split("T")[0];
}

export function nextRecurringDate(
  current: string,
  frequency: "monthly" | "weekly",
): string {
  return frequency === "weekly" ? addDays(current, 7) : addMonths(current, 1);
}

/**
 * Следващ номер на фактура от съществуващи номера (MAX подход, без колазии).
 * Префикс: ИЗХ- за outgoing, ВХ- за incoming.
 */
export function nextInvoiceNumber(
  direction: "outgoing" | "incoming",
  existingNumbers: string[],
): string {
  const prefix = direction === "outgoing" ? "ИЗХ-" : "ВХ-";
  let maxNum = 0;
  for (const n of existingNumbers) {
    const m = n?.match(/(\d+)$/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
  }
  return `${prefix}${String(maxNum + 1).padStart(6, "0")}`;
}

/** Форматира сума в евро (bg-BG локал). */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
