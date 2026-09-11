import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, gte, lte, and, ne } from "drizzle-orm";
import { getAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

// Генерира in-app нотификации от наличните данни (идемпотентно).
// Сигнали: изтичащи документи на машини, ниски наличности, просрочени неплатени фактури.
export async function POST(req: Request) {
  const auth = await getAuth(req);
  if (!auth.session && !auth.isApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const thirtyDaysStr = thirtyDays.toISOString().split("T")[0];

  const created: { type: string; title: string }[] = [];

  async function ensure(type: string, entityType: string, entityId: number, title: string, message: string, severity: string) {
    const existing = await db
      .select({ id: schema.notifications.id })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.type, type),
          eq(schema.notifications.entityType, entityType),
          eq(schema.notifications.entityId, entityId),
          eq(schema.notifications.isRead, false),
        )
      )
      .limit(1)
      .get();
    if (existing) return false;
    await db.insert(schema.notifications).values({
      type,
      entityType,
      entityId,
      title,
      message,
      severity,
      isRead: false,
    });
    created.push({ type, title });
    return true;
  }

  // 1. Изтичащи документи на машини
  const machines = await db.select().from(schema.machines).all();
  const docTypes = [
    { key: "vignette", label: "Винетка", field: "vignetteExpiry" as const },
    { key: "insurance", label: "Гражданска отговорност", field: "insuranceExpiry" as const },
    { key: "tech", label: "Технически преглед", field: "techInspectionExpiry" as const },
  ];
  for (const m of machines) {
    for (const dt of docTypes) {
      const expiry = m[dt.field];
      if (!expiry) continue;
      if (expiry < today) {
        await ensure(
          `machine_${dt.key}`,
          "machine",
          m.id,
          `${dt.label} изтекла — ${m.name}`,
          `${dt.label} на „${m.name}" е изтекла на ${expiry}.`,
          "critical",
        );
      } else if (expiry <= thirtyDaysStr) {
        await ensure(
          `machine_${dt.key}`,
          "machine",
          m.id,
          `${dt.label} изтича — ${m.name}`,
          `${dt.label} на „${m.name}" изтича на ${expiry}.`,
          "warning",
        );
      }
    }
  }

  // 2. Ниски наличности
  const lowStock = await db
    .select({
      id: schema.materials.id,
      name: schema.materials.name,
      quantity: schema.materials.quantity,
      unit: schema.materials.unit,
      minThreshold: schema.materials.minThreshold,
    })
    .from(schema.materials)
    .where(
      and(
        gte(schema.materials.minThreshold, 0.01),
        lte(schema.materials.quantity, schema.materials.minThreshold),
      )
    )
    .all();
  for (const mat of lowStock) {
    await ensure(
      "low_stock",
      "material",
      mat.id,
      `Ниска наличност — ${mat.name}`,
      `Наличността на „${mat.name}" е ${mat.quantity} ${mat.unit} (минимум ${mat.minThreshold}).`,
      "warning",
    );
  }

  // 3. Просрочени неплатени фактури (изходящи, изпратени, неплатени, падеж минал)
  const overdue = await db
    .select({
      id: schema.invoices.id,
      number: schema.invoices.number,
      dueDate: schema.invoices.dueDate,
      total: schema.invoices.total,
      clientId: schema.invoices.clientId,
      clientName: schema.clients.name,
    })
    .from(schema.invoices)
    .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
    .where(
      and(
        eq(schema.invoices.direction, "outgoing"),
        eq(schema.invoices.status, "sent"),
        ne(schema.invoices.paymentStatus, "paid"),
        ne(schema.invoices.dueDate, ""),
        lte(schema.invoices.dueDate, today),
      )
    )
    .all();
  for (const inv of overdue) {
    await ensure(
      "unpaid_invoice",
      "invoice",
      inv.id,
      `Просрочена фактура ${inv.number}`,
      `Фактура ${inv.number} (${inv.clientName || "?"}) е с изтекъл падеж ${inv.dueDate} — ${inv.total.toFixed(2)} €.`,
      "critical",
    );
  }

  return NextResponse.json({ created, count: created.length });
}
