import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import nodemailer from "nodemailer";
import { z } from "zod";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  pdfBase64: z.string().optional(),
  pdfFilename: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { to, subject, html, pdfBase64, pdfFilename } = parsed.data;

  // Get SMTP settings
  const settings = db.select().from(companySettings).get();
  if (!settings || !settings.smtpHost) {
    return NextResponse.json({ error: "SMTP не е конфигуриран в Настройки" }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });

  try {
    const mailOptions: any = {
      from: settings.smtpFrom || settings.smtpUser,
      to,
      subject,
      html,
    };

    if (pdfBase64 && pdfFilename) {
      mailOptions.attachments = [
        {
          filename: pdfFilename,
          content: Buffer.from(pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ];
    }

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Грешка при изпращане" }, { status: 500 });
  }
}
