// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

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

export async function parseInvoicePdf(buffer: Buffer): Promise<ParsedInvoice> {
  const data = await pdfParse(buffer);
  const text = data.text;

  const result: ParsedInvoice = { rawText: text, confidence: "low" };

  // Extract EIK (9 or 13 digits, possibly preceded by ЕИК or EIK)
  const eikMatch = text.match(/(?:ЕИК|EIK|Булстат)[:\s]*(\d{9}|\d{13})/i);
  if (eikMatch) result.supplierEik = eikMatch[1];

  // Extract VAT number (BG + digits)
  const vatMatch = text.match(/(?:ДДС\s*(?:№|номер)|VAT)[:\s]*(BG\d{9,10})/i);
  if (vatMatch) result.supplierVat = vatMatch[1];

  // Also try standalone BG pattern
  if (!result.supplierVat) {
    const bgMatch = text.match(/BG\d{9,10}/);
    if (bgMatch) result.supplierVat = bgMatch[0];
  }

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

  // Extract total amount — look for "ОБЩО", "Total", "Сума за плащане"
  const totalPatterns = [
    /(?:ОБЩО|TOTAL|Сума\s*за\s*плащане|Дължима\s*сума)[:\s]*(\d[\d\s]*[.,]\d{2})/i,
    /(\d[\d\s]*[.,]\d{2})\s*(?:лв\.|BGN|EUR|€)/,
  ];
  for (const p of totalPatterns) {
    const m = text.match(p);
    if (m) {
      result.total = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
      break;
    }
  }

  // Extract VAT
  const vatMatch2 = text.match(/(?:ДДС|VAT)[:\s]*(\d[\d\s]*[.,]\d{2})/i);
  if (vatMatch2) result.vatAmount = parseFloat(vatMatch2[1].replace(/\s/g, "").replace(",", "."));

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
