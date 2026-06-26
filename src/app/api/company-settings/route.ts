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
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = db.select().from(companySettings).limit(1).get();
  if (!settings) {
    const [created] = db.insert(companySettings).values({}).returning().all();
    return NextResponse.json(created);
  }
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = db.select().from(companySettings).limit(1).get();
  if (!existing) {
    const [created] = db.insert(companySettings).values(parsed.data).returning().all();
    return NextResponse.json(created);
  }

  const [updated] = db.update(companySettings).set(parsed.data).where(eq(companySettings.id, existing.id)).returning().all();
  return NextResponse.json(updated);
}
