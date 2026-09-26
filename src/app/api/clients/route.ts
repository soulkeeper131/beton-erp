import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, like, or, asc } from "drizzle-orm";
import { clientSchema, findClientByEik } from "@/lib/clients";
import { firstZodError } from "@/lib/acts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }
  if (parsed.data.eik) {
    const dup = findClientByEik(parsed.data.eik);
    if (dup) {
      return NextResponse.json(
        { error: `Вече има клиент с ЕИК ${parsed.data.eik}: ${dup.companyName || dup.name}`, existingId: dup.id },
        { status: 409 },
      );
    }
  }

  const [created] = await db.insert(clients).values(parsed.data).returning().all();

  return NextResponse.json(created, { status: 201 });
}
