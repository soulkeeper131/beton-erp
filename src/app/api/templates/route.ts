import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { templates } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const result = await db.select().from(templates).orderBy(templates.name);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, type, content } = body;
  if (!name || !type || !content) return NextResponse.json({ error: "Всички полета са задължителни" }, { status: 400 });
  const result = await db.insert(templates).values({ name, type, content }).returning();
  return NextResponse.json(result[0], { status: 201 });
}
