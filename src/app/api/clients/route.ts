import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, like, or, asc } from "drizzle-orm";
import { z } from "zod";

const clientSchema = z.object({
  name: z.string().min(1, "Името е задължително"),
  companyName: z.string().optional().default(""),
  eik: z.string().optional().default(""),
  vatNumber: z.string().optional().default(""),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  let result;
  if (search) {
    result = await db
      .select()
      .from(clients)
      .where(
        or(
          like(clients.name, `%${search}%`),
          like(clients.companyName, `%${search}%`),
          like(clients.eik, `%${search}%`),
          like(clients.phone, `%${search}%`),
          like(clients.email, `%${search}%`)
        )
      )
      .orderBy(asc(clients.name))
      .all();
  } else {
    result = await db
      .select()
      .from(clients)
      .orderBy(asc(clients.name))
      .all();
  }

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [created] = await db
    .insert(clients)
    .values({
      name: parsed.data.name,
      companyName: parsed.data.companyName || null,
      eik: parsed.data.eik || null,
      vatNumber: parsed.data.vatNumber || null,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
    })
    .returning()
    .all();

  return NextResponse.json(created, { status: 201 });
}
