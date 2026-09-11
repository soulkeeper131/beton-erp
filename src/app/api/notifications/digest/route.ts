import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { companySettings, machines, materials, invoices, clients } from "@/db/schema";
import { eq, gte, lte, and, ne } from "drizzle-orm";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

// Изпраща имейл digest с критични сигнали (изтичащи документи, ниски наличности, просрочени фактури).
export async function POST(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const thirtyDaysStr = thirtyDays.toISOString().split("T")[0];

  const settings = db.select().from(companySettings).get();

  // --- Събиране на сигнали ---
  const expiring: string[] = [];
  const allMachines = db.select().from(machines).all();
  const docTypes = [
    { label: "Винетка", field: "vignetteExpiry" as const },
    { label: "ГО", field: "insuranceExpiry" as const },
    { label: "Тех. преглед", field: "techInspectionExpiry" as const },
  ];
  for (const m of allMachines) {
    for (const dt of docTypes) {
      const expiry = m[dt.field];
      if (!expiry) continue;
      if (expiry < today) {
        expiring.push(`🔴 ${dt.label} на „${m.name}" — изтекла на ${expiry}`);
      } else if (expiry <= thirtyDaysStr) {
        expiring.push(`🟡 ${dt.label} на „${m.name}" — изтича на ${expiry}`);
      }
    }
  }

  const lowStock = db
    .select({ name: materials.name, quantity: materials.quantity, unit: materials.unit, minThreshold: materials.minThreshold })
    .from(materials)
    .where(and(gte(materials.minThreshold, 0.01), lte(materials.quantity, materials.minThreshold)))
    .all();
  const lowStockLines = lowStock.map((s) => `📦 „${s.name}" — ${s.quantity} ${s.unit} (мин. ${s.minThreshold})`);

  const overdue = db
    .select({
      number: invoices.number,
      dueDate: invoices.dueDate,
      total: invoices.total,
      clientName: clients.name,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(
      and(
        eq(invoices.direction, "outgoing"),
        eq(invoices.status, "sent"),
        ne(invoices.paymentStatus, "paid"),
        ne(invoices.dueDate, ""),
        lte(invoices.dueDate, today),
      )
    )
    .all();
  const overdueLines = overdue.map((i) => `💶 Фактура ${i.number} (${i.clientName || "?"}) — падеж ${i.dueDate}, ${i.total.toFixed(2)} €`);

  const total = expiring.length + lowStockLines.length + overdueLines.length;

  // --- Изпращане (само ако има сигнали и SMTP е конфигуриран) ---
  if (total === 0) {
    return NextResponse.json({ sent: false, reason: "no_alerts", total: 0 });
  }

  if (!settings || !settings.smtpHost) {
    return NextResponse.json({ sent: false, reason: "smtp_not_configured", total });
  }

  const recipient = settings.email || settings.smtpFrom || settings.smtpUser;
  if (!recipient) {
    return NextResponse.json({ sent: false, reason: "no_recipient", total });
  }

  const sections: string[] = [];
  if (expiring.length) sections.push(`<h3 style="margin:12px 0 6px">🚨 Изтичащи/изтекли документи</h3><ul>${expiring.map((x) => `<li>${x}</li>`).join("")}</ul>`);
  if (lowStockLines.length) sections.push(`<h3 style="margin:12px 0 6px">📦 Ниски наличности</h3><ul>${lowStockLines.map((x) => `<li>${x}</li>`).join("")}</ul>`);
  if (overdueLines.length) sections.push(`<h3 style="margin:12px 0 6px">💶 Просрочени фактури</h3><ul>${overdueLines.map((x) => `<li>${x}</li>`).join("")}</ul>`);

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2>Beton ERP — дневен отчет</h2>
      <p>${total} активни сигнала изискват внимание:</p>
      ${sections.join("")}
      <p style="margin-top:16px;color:#888;font-size:12px">Генерирано автоматично на ${today}.</p>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: { user: settings.smtpUser, pass: settings.smtpPass },
  });

  try {
    await transporter.sendMail({
      from: settings.smtpFrom || settings.smtpUser,
      to: recipient,
      subject: `Beton ERP — ${total} активни сигнала (${today})`,
      html,
    });
    return NextResponse.json({ sent: true, total });
  } catch (err: any) {
    return NextResponse.json({ sent: false, reason: "smtp_error", error: err.message, total }, { status: 500 });
  }
}
