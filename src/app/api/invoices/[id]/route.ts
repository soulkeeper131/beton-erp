import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  const result = await db.select({
    id: invoices.id, number: invoices.number, date: invoices.date, dueDate: invoices.dueDate,
    total: invoices.total, vatRate: invoices.vatRate, vatAmount: invoices.vatAmount,
    status: invoices.status, type: invoices.type, notes: invoices.notes, pdfPath: invoices.pdfPath,
    clientId: invoices.clientId,
    client: { id: clients.id, name: clients.name },
  })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.id, id)).limit(1);
  if (!result.length) return NextResponse.json({ error: "Не е намерено" }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Невалиден ID" }, { status: 400 });
  const body = await request.json();
  const result = await db.update(invoices).set(body).where(eq(invoices.id, id)).returning();
  return NextResponse.json(result[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  await db.delete(invoices).where(eq(invoices.id, id));
  return NextResponse.json({ message: "Изтрито" });
}
