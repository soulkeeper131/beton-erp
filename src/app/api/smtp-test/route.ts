import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const testEmail = body.email;

  const settings = db.select().from(companySettings).limit(1).get();
  if (!settings || !settings.smtpHost) {
    return NextResponse.json({ error: "SMTP не е конфигуриран" }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: !!settings.smtpSecure,
      auth: {
        user: settings.smtpUser || undefined,
        pass: settings.smtpPass || undefined,
      },
    });

    await transporter.sendMail({
      from: settings.smtpFrom || settings.smtpUser,
      to: testEmail,
      subject: "Beton ERP — Тестов мейл ✅",
      text: "Това е тестов мейл от Beton ERP системата.\n\nАко получавате това съобщение, настройките на мейл сървъра са правилни.",
      html: `<div style="font-family:Arial;padding:20px">
        <h2>🏗️ Beton ERP — Тестов мейл</h2>
        <p>Това е тестов мейл от <strong>Beton ERP</strong> системата.</p>
        <p style="color:green">✅ Ако получавате това съобщение, настройките на мейл сървъра са правилни.</p>
        <hr>
        <small>Изпратено от ${settings.companyName || "Beton ERP"}</small>
      </div>`,
    });

    return NextResponse.json({ success: true, message: "Тестовият мейл е изпратен успешно" });
  } catch (e: any) {
    return NextResponse.json({ error: `Грешка: ${e.message}` }, { status: 500 });
  }
}
