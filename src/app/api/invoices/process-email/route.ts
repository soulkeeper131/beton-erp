import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { fetchUnreadInvoices, markSeen } from "@/lib/imap";
import { parseInvoicePdf } from "@/lib/invoice-parser";
import { importIncomingEmail } from "@/lib/incoming-invoice";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = db.select().from(companySettings).limit(1).get();
  if (!settings?.imapHost) {
    return NextResponse.json({ error: "IMAP не е конфигуриран" }, { status: 400 });
  }
  const imapConfig = {
    host: settings.imapHost,
    port: settings.imapPort,
    user: settings.imapUser,
    password: settings.imapPass,
    tls: settings.imapTls,
    folder: settings.incomingEmailFolder,
  };

  let emails;
  try {
    emails = await fetchUnreadInvoices(imapConfig);
  } catch (e: any) {
    return NextResponse.json({ error: `IMAP: ${e.message}` }, { status: 502 });
  }

  const drafts: any[] = [];
  const errors: { subject: string; error: string }[] = [];
  const done: number[] = []; // UID-и за маркиране като прочетени

  for (const email of emails) {
    const pdfAtt = email.attachments.find(
      (a) => a.contentType.includes("pdf") || a.filename.toLowerCase().endsWith(".pdf")
    );
    if (!pdfAtt) continue; // не е фактура — оставяме писмото непрочетено

    // Всяко писмо поотделно — грешка в едно не спира останалите
    try {
      const parsed = await parseInvoicePdf(pdfAtt.content, { eik: settings.eik, vatNumber: settings.vatNumber });
      const result = importIncomingEmail(email, parsed, pdfAtt);
      if (result.status === "created") drafts.push(result);
      done.push(email.uid);
    } catch (e: any) {
      errors.push({ subject: email.subject, error: e.message });
    }
  }

  // Маркираме като прочетени само успешно обработените (преди писмата оставаха
  // непрочетени и всяко „Провери имейла“ създаваше същите чернови отново)
  if (done.length) {
    try {
      await markSeen(imapConfig, done);
    } catch {
      // не е фатално — дублите се хващат и по UID на писмото
    }
  }

  return NextResponse.json({
    processed: emails.length,
    created: drafts.length,
    drafts,
    errors,
  });
}
