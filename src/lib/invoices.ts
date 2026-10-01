import { z } from "zod";

// Обща логика за фактурите — чисти функции (тестват се без база).

const money = (msg: string) => z.coerce.number({ invalid_type_error: msg });

export const invoiceItemSchema = z.object({
  description: z.string({ required_error: "Въведете описание" }).trim().min(1, "Въведете описание"),
  unit: z.string().trim().min(1).default("бр."),
  quantity: money("Невалидно количество").positive("Количеството трябва да е > 0"),
  price: money("Невалидна цена").min(0, "Цената не може да е отрицателна"),
  vatRate: money("Невалидна ставка").refine((v) => [0, 9, 20].includes(v), "ДДС ставката трябва да е 0, 9 или 20%").default(20),
});

const date = (label: string) =>
  z.string({ required_error: `${label}: задължително поле` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${label}: невалидна дата`);

// Празно поле от формата ("") = няма стойност. Преди "" ставаше 0 и цялата фактура
// се отхвърляше с „Number must be greater than 0“ (формата праща supplierId: "").
const optionalId = z.preprocess(
  (v) => (v === "" || v === 0 || v === "0" ? null : v),
  z.coerce.number({ invalid_type_error: "Невалиден избор" }).int().positive("Невалиден избор").nullable().optional(),
);

export const invoiceSchema = z.object({
  clientId: z.coerce.number({ invalid_type_error: "Изберете клиент" }).int().positive("Изберете клиент"),
  supplierId: optionalId,
  // Изходящите получават номер при издаване; входящите — номера от доставчика/входящия регистър
  number: z.string().trim().optional().nullable(),
  date: date("Дата"),
  dueDate: date("Падеж"),
  taxEventDate: date("Данъчно събитие"),
  direction: z.enum(["incoming", "outgoing"]).default("outgoing"),
  type: z.enum(["invoice", "proforma", "credit_note", "debit_note"]).default("invoice"),
  currency: z.string().default("EUR"),
  discountPercent: z.coerce.number().min(0).max(100, "Отстъпката е над 100%").default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["bank", "cash", "card"]).default("bank"),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).default("unpaid"),
  relatedInvoiceId: optionalId,
  taxExemptionReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema, { required_error: "Добавете поне един ред" }).min(1, "Добавете поне един ред"),
  // Актове, които се фактурират с тази фактура
  pouringIds: z.array(z.coerce.number().int().positive()).optional().default([]),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

const FIELD_LABELS: Record<string, string> = { clientId: "Клиент", date: "Дата", dueDate: "Падеж", taxEventDate: "Данъчно събитие" };

export function invoiceZodError(err: z.ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Невалидни данни";
  const [head, idx] = issue.path;
  if (head === "items" && typeof idx === "number") return `Ред ${idx + 1}: ${issue.message}`;
  const label = FIELD_LABELS[String(head)];
  return label && !issue.message.startsWith(label) ? `${label}: ${issue.message}` : issue.message;
}

/** Бизнес правила, които не зависят от базата. Връща грешка или null. */
export function checkInvoiceRules(d: InvoiceInput): string | null {
  // 0% ДДС изисква основание за неначисляване (чл. 114, ал. 1, т. 12 ЗДДС)
  if (d.direction === "outgoing" && d.items.some((i) => i.vatRate === 0) && !d.taxExemptionReason?.trim()) {
    return "При ред с 0% ДДС попълнете „Основание за нулева ставка“";
  }
  if (d.dueDate < d.date) return "Падежът е преди датата на фактурата";
  if (d.direction === "incoming" && !d.number?.trim()) return "Въведете номера на входящата фактура";
  if (d.pouringIds.length && (d.direction !== "outgoing" || d.type !== "invoice")) {
    return "Актове се фактурират само с изходяща фактура";
  }
  return null;
}

// ---- Номерация ----
// Фактурите, кредитните и дебитните известия са една поредица без пропуски (чл. 78 ППЗДДС),
// затова изходящият документ получава номер чак при издаване. Черновите са „Чернова-<id>“.
// Проформите не са данъчни документи — отделна поредица, за да не правят дупки.

export const DRAFT_PREFIX = "Чернова-";
export const PROFORMA_PREFIX = "PF-";

export const isDraftNumber = (n: string | null | undefined) => !!n && n.startsWith(DRAFT_PREFIX);

export function nextProformaNumber(existing: string[]): string {
  let max = 0;
  for (const n of existing) {
    const m = n?.match(/^PF-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${PROFORMA_PREFIX}${String(max + 1).padStart(6, "0")}`;
}

// ---- Фактуриране на актове ----

export type ActForInvoice = {
  id: number;
  date: string;
  siteName?: string | null;
  items: { concreteTypeName?: string | null; quantityM3: number; pricePerM3: number }[];
};

/** Редове на фактура от актове: по ред за всеки тип бетон в акта. */
export function actInvoiceLines(acts: ActForInvoice[]) {
  const lines: { description: string; unit: string; quantity: number; price: number; vatRate: number }[] = [];
  for (const a of [...acts].sort((x, y) => x.date.localeCompare(y.date) || x.id - y.id)) {
    const [y, m, d] = a.date.split("-");
    for (const it of a.items) {
      if (!(it.quantityM3 > 0)) continue;
      lines.push({
        description: `Бетон ${it.concreteTypeName || ""}`.trim() + ` — акт №${a.id} от ${d}.${m}.${y}` + (a.siteName ? `, ${a.siteName}` : ""),
        unit: "m³",
        quantity: it.quantityM3,
        price: it.pricePerM3,
        vatRate: 20,
      });
    }
  }
  return lines;
}
