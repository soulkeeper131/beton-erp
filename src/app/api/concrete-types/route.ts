import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { concreteTypes } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const concreteTypeSchema = z.object({
  name: z.string().min(1, "Името е задължително"),
  className: z.string().optional().default(""),
  pricePerM3: z.number().min(0, "Цената трябва да е положителна"),
  description: z.string().optional().default(""),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const types = await db
    .select()
    .from(concreteTypes)
    .orderBy(asc(concreteTypes.name))
    .all();

  return NextResponse.json(types);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = concreteTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [created] = await db.insert(concreteTypes).values({
    name: parsed.data.name,
    className: parsed.data.className || null,
    pricePerM3: parsed.data.pricePerM3,
    description: parsed.data.description || null,
    active: true,
  }).returning().all();

  return NextResponse.json(created, { status: 201 });
}
