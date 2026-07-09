import { db } from "@/db";
import { companySettings } from "@/db/schema";
import nodemailer from "nodemailer";

/** Send an email using configured SMTP. Fails silently if SMTP not configured. */
export async function sendEmailNotification(opts: {
  to: string;
  subject: string;
  html: string;
  pdfBase64?: string;
  pdfFilename?: string;
}) {
  try {
    const settings = db.select().from(companySettings).get();
    if (!settings?.smtpHost) return; // SMTP not configured — skip silently

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: !!settings.smtpSecure,
      auth: {
        user: settings.smtpUser || undefined,
        pass: settings.smtpPass || undefined,
      },
    });

    const mailOptions: any = {
      from: settings.smtpFrom || settings.smtpUser,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    };

    if (opts.pdfBase64 && opts.pdfFilename) {
      mailOptions.attachments = [
        {
          filename: opts.pdfFilename,
          content: Buffer.from(opts.pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ];
    }

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${opts.to}: ${opts.subject}`);
  } catch (err: any) {
    console.error(`📧 Email failed to ${opts.to}: ${err.message}`);
    // Don't throw — notifications shouldn't block the main operation
  }
}

/** Notify when a new invoice is created */
export async function notifyInvoiceCreated(invoice: {
  number: string;
  date: string;
  clientEmail: string;
  clientName: string;
  total: number;
  pdfBase64?: string;
}) {
  const settings = db.select().from(companySettings).get();
  const companyName = settings?.companyName || "Beton ERP";

  await sendEmailNotification({
    to: invoice.clientEmail,
    subject: `Фактура № ${invoice.number} от ${companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
        <h2 style="color:#f97316">${companyName}</h2>
        <p>Уважаеми/а ${invoice.clientName},</p>
        <p>Издадена е фактура <strong>№ ${invoice.number}</strong> от ${invoice.date} на стойност <strong>${invoice.total.toFixed(2)} €</strong>.</p>
        <p>Приложен е PDF файл с фактурата.</p>
        <hr style="margin:20px 0;border:1px solid #eee">
        <p style="font-size:12px;color:#888">Това е автоматично съобщение от ${companyName} ERP системата.</p>
      </div>
    `,
    pdfBase64: invoice.pdfBase64,
    pdfFilename: `Фактура_${invoice.number}.pdf`,
  });
}

/** Notify when a new offer is created */
export async function notifyOfferCreated(offer: {
  number: string;
  clientEmail: string;
  clientName: string;
  siteName?: string;
  total: number;
}) {
  const settings = db.select().from(companySettings).get();
  const companyName = settings?.companyName || "Beton ERP";

  await sendEmailNotification({
    to: offer.clientEmail,
    subject: `Оферта № ${offer.number} — ${companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
        <h2 style="color:#f97316">${companyName}</h2>
        <p>Уважаеми/а ${offer.clientName},</p>
        <p>Приложена е оферта <strong>№ ${offer.number}</strong>${offer.siteName ? ` за обект "${offer.siteName}"` : ""} на стойност <strong>${offer.total.toFixed(2)} €</strong>.</p>
        <p>Можете да я разгледате в платформата или да се свържете с нас за въпроси.</p>
        <hr style="margin:20px 0;border:1px solid #eee">
        <p style="font-size:12px;color:#888">Това е автоматично съобщение от ${companyName} ERP системата.</p>
      </div>
    `,
  });
}

/** Notify when a pouring (act) is created */
export async function notifyPouringCreated(pouring: {
  id: number;
  clientEmail: string;
  clientName: string;
  siteName?: string;
  totalM3: number;
}) {
  const settings = db.select().from(companySettings).get();
  const companyName = settings?.companyName || "Beton ERP";

  await sendEmailNotification({
    to: pouring.clientEmail,
    subject: `Акт № ${pouring.id} за обект "${pouring.siteName || "—"}" — ${companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
        <h2 style="color:#f97316">${companyName}</h2>
        <p>Уважаеми/а ${pouring.clientName},</p>
        <p>Създаден е акт <strong>№ ${pouring.id}</strong> за обект "${pouring.siteName || "—"}" с количество <strong>${pouring.totalM3.toFixed(2)} m³</strong>.</p>
        <p>Можете да го разгледате в платформата.</p>
        <hr style="margin:20px 0;border:1px solid #eee">
        <p style="font-size:12px;color:#888">Това е автоматично съобщение от ${companyName} ERP системата.</p>
      </div>
    `,
  });
}
