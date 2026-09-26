import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { clientSchema, clientUsage, findClientByEik } from "@/lib/clients";
import { firstZodError } from "@/lib/acts";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await db
    .select()
    .from(clients)
    .where(eq(clients.id, parseInt(params.id)))
    .get();

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = clientSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }
  if (parsed.data.eik) {
    const dup = findClientByEik(parsed.data.eik, parseInt(params.id));
    if (dup) {
      return NextResponse.json({ error: `Вече има клиент с ЕИК ${parsed.data.eik}: ${dup.companyName || dup.name}`, existingId: dup.id }, { status: 409 });
    }
  }

  const existing = await db
    .select()
    .from(clients)
    .where(eq(clients.id, parseInt(params.id)))
    .get();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db
    .update(clients)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(clients.id, parseInt(params.id)))
    .returning()
    .all();

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db
    .select()
    .from(clients)
    .where(eq(clients.id, parseInt(params.id)))
    .get();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Клиент с обекти/оферти/фактури не се трие (FK грешка → 500 досега)
  const usage = clientUsage(existing.id);
  if (usage.length) {
    return NextResponse.json({ error: `Клиентът има ${usage.join(", ")} и не може да се изтрие` }, { status: 409 });
  }
  await db.delete(clients).where(eq(clients.id, existing.id));
  return NextResponse.json({ success: true });
}
