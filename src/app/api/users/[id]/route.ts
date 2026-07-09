import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

// GET /api/users/[id] — get single user
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    phone: users.phone,
    active: users.active,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, parseInt(params.id))).get();

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

// PUT /api/users/[id] — update user
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const userId = parseInt(params.id);

  const existing = db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) {
    // Check unique
    const dup = db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).get();
    if (dup && dup.id !== userId) {
      return NextResponse.json({ error: "Email вече се използва от друг потребител" }, { status: 409 });
    }
    updateData.email = body.email;
  }
  if (body.role !== undefined) updateData.role = body.role;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.active !== undefined) updateData.active = body.active;
  if (body.password) updateData.passwordHash = await hash(body.password, 10);
  updateData.updatedAt = new Date().toISOString();

  db.update(users).set(updateData).where(eq(users.id, userId)).run();
  return NextResponse.json({ success: true });
}

// DELETE /api/users/[id] — delete user
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = parseInt(params.id);
  const existing = db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.delete(users).where(eq(users.id, userId)).run();
  return NextResponse.json({ success: true });
}
