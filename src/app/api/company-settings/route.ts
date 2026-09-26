import { NextResponse } from "next/server";
import { getAuth, requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  companyName: z.string().optional().default(""),
  companyNameBG: z.string().optional().default(""),
  eik: z.string().optional().default(""),
  vatNumber: z.string().optional().default(""),
  address: z.string().optional().default(""),
  city: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  mol: z.string().optional().default(""),
  bankName: z.string().optional().default(""),
  iban: z.string().optional().default(""),
  bic: z.string().optional().default(""),
  accentColor: z.string().optional().default("#f97316"),
  smtpHost: z.string().optional().default(""),
  smtpPort: z.number().optional().default(587),
  smtpUser: z.string().optional().default(""),
  smtpPass: z.string().optional().default(""),
  smtpFrom: z.string().optional().default(""),
  smtpSecure: z.boolean().optional().default(false),
  imapHost: z.string().optional().default(""),
  imapPort: z.number().optional().default(993),
  imapUser: z.string().optional().default(""),
  imapPass: z.string().optional().default(""),
  imapTls: z.boolean().optional().default(true),
  incomingEmailFolder: z.string().optional().default("INBOX"),
  aiApiKey: z.string().optional().default(""),
  companybookApiKey: z.string().optional().default(""),
});

// Тайните не се връщат — само дали са зададени
const SECRETS = ["smtpPass", "imapPass", "aiApiKey", "companybookApiKey"] as const;
const MASK = "••••••";
function masked<T extends Record<string, any>>(row: T): T {
  const out: Record<string, any> = { ...row };
  for (const k of SECRETS) out[k] = row[k] ? MASK : "";
  return out as T;
}

export async function GET(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = db.select().from(companySettings).limit(1).get();
  if (!settings) {
    const [created] = db.insert(companySettings).values({}).returning().all();
    return NextResponse.json(masked(created));
  }
  return NextResponse.json(masked(settings));
}

// Само админ: SMTP/IMAP/AI ключове пренасочват имейли и достъп до външни услуги
export async function PATCH(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin === "forbidden") return NextResponse.json({ error: "Само администратор променя настройките" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.smtpSecure === "string") body.smtpSecure = body.smtpSecure === "on" || body.smtpSecure === "true";
  if (typeof body.imapTls === "string") body.imapTls = body.imapTls === "on" || body.imapTls === "true";
  if (typeof body.smtpPort === "string") body.smtpPort = parseInt(body.smtpPort) || 587;
  if (typeof body.imapPort === "string") body.imapPort = parseInt(body.imapPort) || 993;
  // Маскирана тайна (само „•“) = без промяна
  for (const k of SECRETS) {
    if (typeof body[k] === "string" && /^•+$/.test(body[k])) delete body[k];
  }

  // .partial() без default-и: непратено поле остава както е (преди default "" трием
  // AI ключа при всеки запис, защото формата не праща маскирания ключ)
  const parsed = settingsSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Невалидни настройки" }, { status: 400 });
  const update: Record<string, any> = {};
  for (const [k, v] of Object.entries(parsed.data)) if (k in body && v !== undefined) update[k] = v;

  const existing = db.select().from(companySettings).limit(1).get();
  if (!existing) {
    const [created] = db.insert(companySettings).values(update).returning().all();
    return NextResponse.json(masked(created));
  }
  if (!Object.keys(update).length) return NextResponse.json(masked(existing));

  const [updated] = db.update(companySettings).set(update).where(eq(companySettings.id, existing.id)).returning().all();
  return NextResponse.json(masked(updated));
}
