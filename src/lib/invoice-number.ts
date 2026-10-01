import { previewNumber } from "@/lib/invoices-db";

// Единствен източник на номера на фактури (API, агент, периодични, имейл).
// Изходящите получават номера си при издаване (lib/invoices-db → issueInvoice);
// за тях това е номерът, който ще получи следващият издаден документ.
export function getNextInvoiceNumber(direction: "outgoing" | "incoming"): string {
  return previewNumber(direction);
}
