import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

// Маркира една нотификация като прочетена
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth(req);
  if (!auth.session && !auth.isApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = parseInt(params.id);
  await db.update(schema.notifications).set({ isRead: true }).where(eq(schema.notifications.id, id));
  return NextResponse.json({ ok: true });
}

// Изтрива нотификация
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth(req);
  if (!auth.session && !auth.isApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = parseInt(params.id);
  await db.delete(schema.notifications).where(eq(schema.notifications.id, id));
  return NextResponse.json({ ok: true });
}
