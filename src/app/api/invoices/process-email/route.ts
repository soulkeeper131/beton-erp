import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { companySettings, invoices, invoiceItems, clients } from "@/db/schema";
import { fetchUnreadInvoices } from "@/lib/imap";
import { parseInvoicePdf } from "@/lib/invoice-parser";
import { eq, sql } from "drizzle-orm";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = db.select().from(companySettings).limit(1).get();
  if (!settings?.imapHost) {
    return NextResponse.json({ error: "IMAP не е конфигуриран" }, { status: 400 });
  }

  try {
    const emails = await fetchUnreadInvoices({
      host: settings.imapHost,
      port: settings.imapPort,
      user: settings.imapUser,
      password: settings.imapPass,
      tls: settings.imapTls,
      folder: settings.incomingEmailFolder,
    });

    const created: any[] = [];

    for (const email of emails) {
      // Find first PDF attachment
      const pdfAtt = email.attachments.find(
        (a) => a.contentType.includes("pdf") || a.filename.endsWith(".pdf")
      );
      if (!pdfAtt) continue;

      // Parse PDF
      const parsed = await parseInvoicePdf(pdfAtt.content);

      // Save PDF locally
      const pdfDir = path.join(process.cwd(), "data", "incoming-invoices");
      mkdirSync(pdfDir, { recursive: true });
      const safeName = pdfAtt.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const pdfPath = path.join(pdfDir, `${Date.now()}-${safeName}`);
      writeFileSync(pdfPath, pdfAtt.content);

      // Look up or create supplier client
      let supplierId: number | null = null;
      if (parsed.supplierEik) {
        const existing = db
          .select()
          .from(clients)
          .where(eq(clients.eik, parsed.supplierEik))
          .get();
        if (existing) {
          supplierId = existing.id;
        } else if (parsed.supplierName) {
          const createdClient = db
            .insert(clients)
            .values({
              name: parsed.supplierName,
              companyName: parsed.supplierName,
              eik: parsed.supplierEik,
              vatNumber: parsed.supplierVat || "",
            })
            .returning()
            .get();
          supplierId = createdClient.id;
        }
      }

      // Generate next incoming number
      const countResult = db.select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.direction, "incoming"))
        .get();
      const count = countResult?.count || 0;
      const autoNumber = `ВХ-${String(count + 1).padStart(6, "0")}`;

      // Use parsed date or email date
      const invoiceDate = parsed.date || email.date.toISOString().split("T")[0];

      // Create draft incoming invoice
      const invoice = db
        .insert(invoices)
        .values({
          clientId: supplierId ?? 0,
          number: autoNumber,
          date: invoiceDate,
          dueDate: parsed.dueDate || "",
          taxEventDate: invoiceDate,
          direction: "incoming",
          type: "invoice",
          currency: "EUR",
          subtotal: parsed.total || 0,
          total: parsed.total || 0,
          vatAmount: parsed.vatAmount || 0,
          paymentStatus: "unpaid",
          status: "draft",
          pdfPath: pdfPath,
          notes: JSON.stringify({
            source: "email",
            subject: email.subject,
            from: email.from,
            originalNumber: parsed.invoiceNumber || "",
            confidence: parsed.confidence,
          }),
        })
        .returning()
        .get();

      created.push({
        id: invoice.id,
        number: autoNumber,
        confidence: parsed.confidence,
        supplier: parsed.supplierName || email.from,
      });
    }

    return NextResponse.json({
      processed: emails.length,
      created: created.length,
      drafts: created,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
