import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { templates } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;

  const result = db.select().from(templates).orderBy(templates.name).all();
  return NextResponse.json(result);
}

const TYPES = ["offer", "contract", "act", "invoice", "protocol"];

// Шаблоните се ползват само през API (няма екран) — променя ги само администратор.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin === "forbidden") return NextResponse.json({ error: "Само администратор добавя шаблони" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const { type, content } = body;
  if (!name || !type || typeof content !== "string" || !content) return NextResponse.json({ error: "Всички полета са задължителни" }, { status: 400 });
  if (!TYPES.includes(type)) return NextResponse.json({ error: `Невалиден тип — позволени: ${TYPES.join(", ")}` }, { status: 400 });
  if (name.length > 200 || content.length > 200_000) return NextResponse.json({ error: "Шаблонът е твърде голям" }, { status: 400 });
  const result = db.insert(templates).values({ name, type, content }).returning().get();
  return NextResponse.json(result, { status: 201 });
}
