import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

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
  smtpHost: z.string().optional().default(""),
  smtpPort: z.number().optional().default(587),
  smtpUser: z.string().optional().default(""),
  smtpPass: z.string().optional().default(""),
  smtpFrom: z.string().optional().default(""),
  smtpSecure: z.boolean().optional().default(false),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = db.select().from(companySettings).limit(1).get();
  if (!settings) {
    const [created] = db.insert(companySettings).values({}).returning().all();
    return NextResponse.json({ ...created, smtpPass: created.smtpPass ? "••••••" : "" });
  }
  return NextResponse.json({ ...settings, smtpPass: settings.smtpPass ? "••••••" : "" });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // Convert checkbox value to boolean
  if (typeof body.smtpSecure === "string") body.smtpSecure = body.smtpSecure === "on" || body.smtpSecure === "true";
  if (typeof body.smtpPort === "string") body.smtpPort = parseInt(body.smtpPort) || 587;
  // If smtpPass is the masked value, keep existing
  if (body.smtpPass === "••••••") {
    const existing = db.select().from(companySettings).limit(1).get();
    body.smtpPass = existing?.smtpPass || "";
  }
  
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = db.select().from(companySettings).limit(1).get();
  if (!existing) {
    const [created] = db.insert(companySettings).values(parsed.data).returning().all();
    return NextResponse.json({ ...created, smtpPass: "••••••" });
  }

  const [updated] = db.update(companySettings).set(parsed.data).where(eq(companySettings.id, existing.id)).returning().all();
  return NextResponse.json({ ...updated, smtpPass: "••••••" });
}
