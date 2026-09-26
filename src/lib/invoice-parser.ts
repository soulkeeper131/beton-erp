// pdf-parse v2: класът PDFParse (v1 беше функция — require("pdf-parse")(buf) хвърляше
// „is not a function“ и импортът от имейл не работеше изобщо)
import { PDFParse } from "pdf-parse";

export interface ParsedInvoice {
  supplierName?: string;
  supplierEik?: string;
  supplierVat?: string;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  total?: number;
  vatAmount?: number;
  currency?: string;
  rawText: string;
  confidence: "high" | "medium" | "low";
}

// ЕИК/ДДС номерът на нашата фирма — във входящата фактура е получателят, не доставчикът
export interface OwnCompany {
  eik?: string | null;
  vatNumber?: string | null;
}

export async function parseInvoicePdf(buffer: Buffer, own: OwnCompany = {}): Promise<ParsedInvoice> {
  const parser = new PDFParse({ data: buffer });
  try {
    const { text } = await parser.getText();
    return parseInvoiceText(text, own);
  } finally {
    await parser.destroy();
  }
}

export function parseInvoiceText(text: string, own: OwnCompany = {}): ParsedInvoice {
  const result: ParsedInvoice = { rawText: text, confidence: "low" };
  const ownEik = (own.eik || "").trim();
  const ownVat = (own.vatNumber || "").trim().toUpperCase();

  // ЕИК на доставчика: първият ЕИК, който НЕ е нашият (във фактурата са и двата)
  const eiks = Array.from(text.matchAll(/(?:ЕИК|EIK|Булстат)[:\s]*(\d{9}|\d{13})/gi)).map((m) => m[1]);
  result.supplierEik = eiks.find((e) => e !== ownEik);

  // ДДС номер на доставчика (BG + цифри), без нашия
  const vats = Array.from(text.matchAll(/BG\d{9,10}/g)).map((m) => m[0]);
  result.supplierVat = vats.find((v) => v.toUpperCase() !== ownVat);

  // Extract invoice number - multiple patterns
  const numPatterns = [
    /(?:Фактура|ФАКТУРА|Invoice|INVOICE)\s*(?:№|No|#)?[:\s]*([A-ZА-Я0-9\-]{2,20})/i,
    /(?:№|No)\s*(\d{4,10})/,
  ];
  for (const p of numPatterns) {
    const m = text.match(p);
    if (m) { result.invoiceNumber = m[1]; break; }
  }

  // Extract dates (DD.MM.YYYY or YYYY-MM-DD)
  const dateMatches = text.match(/(\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})/g);
  if (dateMatches) {
    const uniqueDates = Array.from(new Set(dateMatches)) as string[];
    const dates: string[] = [];
    for (const d of uniqueDates) {
      const nd = normalizeDate(d);
      if (nd) dates.push(nd);
    }
    if (dates[0]) result.date = dates[0];
    // Second distinct date is likely due date
    const distinctDates = dates.filter(d => d !== result.date);
    if (distinctDates[0]) result.dueDate = distinctDates[0];
  }

  // Обща сума: „ОБЩО ЗА ПЛАЩАНЕ“ / „Сума за плащане“ / TOTAL (може на следващ ред);
  // иначе най-голямата сума с валута (общото е най-голямото число във фактурата)
  const amount = (v: string) => parseFloat(v.replace(/\s/g, "").replace(",", "."));
  const totalM = text.match(/(?:ОБЩО\s*(?:ЗА\s*ПЛАЩАНЕ)?|Сума\s*за\s*плащане|Дължима\s*сума|TOTAL)[^\d]{0,40}?(\d[\d ]*[.,]\d{2})/i);
  if (totalM) result.total = amount(totalM[1]);
  const withCurrency = Array.from(text.matchAll(/(\d[\d ]*[.,]\d{2})\s*(?:лв\.?|BGN|EUR|€)/g)).map((m) => amount(m[1]));
  if (withCurrency.length) {
    const max = Math.max(...withCurrency);
    if (!result.total || result.total < max) result.total = max;
  }

  // ДДС: „ДДС 20% 100.00“, „ДДС: 100,00“, „VAT 100.00“
  const vatAmt = text.match(/(?:ДДС|VAT)\s*(?:\d{1,2}\s*%)?[:\s]*(\d[\d ]*[.,]\d{2})/i);
  if (vatAmt) result.vatAmount = amount(vatAmt[1]);

  // Extract company name — first meaningful line or after "Доставчик"/"Продавач"
  const supplierPatterns = [
    /(?:Доставчик|Supplier|Продавач|ПРОДАВАЧ|От)[:\s]*\n?([^\n]{3,80})/i,
  ];
  for (const p of supplierPatterns) {
    const m = text.match(p);
    if (m) { result.supplierName = m[1].trim(); break; }
  }

  // Determine confidence
  let score = 0;
  if (result.supplierEik) score++;
  if (result.invoiceNumber) score++;
  if (result.total) score++;
  if (result.date) score++;
  if (score >= 3) result.confidence = "high";
  else if (score >= 1) result.confidence = "medium";

  return result;
}

function normalizeDate(d: string): string | null {
  try {
    if (d.includes(".")) {
      const [day, month, year] = d.split(".");
      return `${year}-${month}-${day}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  } catch {}
  return null;
}
