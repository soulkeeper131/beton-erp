import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, clients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const result = await db.select({
    id: invoices.id, number: invoices.number, date: invoices.date, dueDate: invoices.dueDate,
    total: invoices.total, vatRate: invoices.vatRate, vatAmount: invoices.vatAmount,
    status: invoices.status, type: invoices.type,
    clientId: invoices.clientId,
    client: { id: clients.id, name: clients.name },
  })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(invoices.date));
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clientId, number, date, dueDate, type, notes } = body;
  if (!clientId || !number || !date || !dueDate) {
    return NextResponse.json({ error: "Клиент, номер, дата и падеж са задължителни" }, { status: 400 });
  }
  const result = await db.insert(invoices).values({
    clientId, number, date, dueDate,
    type: type || "invoice",
    total: 0, vatRate: 20, vatAmount: 0,
    status: "draft",
    notes: notes || null,
  }).returning();
  return NextResponse.json(result[0], { status: 201 });
}
