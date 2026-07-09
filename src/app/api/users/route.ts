import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

// GET /api/users — list all users (admin only)
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const all = db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    phone: users.phone,
    active: users.active,
    createdAt: users.createdAt,
  }).from(users).orderBy(users.name).all();

  return NextResponse.json(all);
}

// POST /api/users — create user (admin only)
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { email, password, name, role, phone } = body;

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Email, парола и име са задължителни" }, { status: 400 });
  }

  // Check existing
  const existing = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (existing) {
    return NextResponse.json({ error: "Потребител с този email вече съществува" }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);
  const result = db.insert(users).values({
    email,
    passwordHash,
    name,
    role: role || "employee",
    phone: phone || null,
  }).returning({ id: users.id }).get();

  return NextResponse.json({ id: result.id, email, name, role: role || "employee", phone }, { status: 201 });
}
