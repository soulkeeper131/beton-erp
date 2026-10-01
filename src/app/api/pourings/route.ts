import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { pourings, pouringItems, sites, offers, concreteTypes, machines, invoices } from "@/db/schema";
import { and, eq, desc, asc, inArray, isNull, isNotNull } from "drizzle-orm";
import { actCreateSchema, firstZodError } from "@/lib/acts";
import { checkActRefs } from "@/lib/acts-db";
import { roundMoney } from "@/lib/calc";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const offerId = searchParams.get("offerId");

  const clientId = searchParams.get("clientId");
  const invoiced = searchParams.get("invoiced"); // "0" нефактурирани, "1" фактурирани
  const ids = searchParams.get("ids"); // "1,2,3" — за фактура от избрани актове

  const conds: any[] = [];
  if (offerId) conds.push(eq(pourings.offerId, parseInt(offerId)));
  else if (siteId) conds.push(eq(pourings.siteId, parseInt(siteId)));
  if (clientId) conds.push(eq(sites.clientId, parseInt(clientId)));
  if (invoiced === "0") conds.push(isNull(pourings.invoiceId));
  if (invoiced === "1") conds.push(isNotNull(pourings.invoiceId));
  if (ids) conds.push(inArray(pourings.id, ids.split(",").map(Number).filter((n) => n > 0)));
  const where = conds.length ? and(...conds) : undefined;

  const result = await db.select({
    id: pourings.id,
    date: pourings.date,
    status: pourings.status,
    weather: pourings.weather,
    notes: pourings.notes,
    siteId: pourings.siteId,
    offerId: pourings.offerId,
    machineId: pourings.machineId,
    invoiceId: pourings.invoiceId,
    clientId: sites.clientId,
    site: { id: sites.id, name: sites.name },
    offer: { id: offers.id, number: offers.number },
    machine: { id: machines.id, name: machines.name },
    invoice: { id: invoices.id, number: invoices.number, status: invoices.status },
  })
    .from(pourings)
    .leftJoin(sites, eq(pourings.siteId, sites.id))
    .leftJoin(offers, eq(pourings.offerId, offers.id))
    .leftJoin(machines, eq(pourings.machineId, machines.id))
    .leftJoin(invoices, eq(pourings.invoiceId, invoices.id))
    .where(where)
    .orderBy(desc(pourings.date));

  // Attach items
  const pouringIds = result.map(p => p.id);
  if (pouringIds.length > 0) {
    const allItems = await db.select({
      id: pouringItems.id,
      pouringId: pouringItems.pouringId,
      concreteTypeId: pouringItems.concreteTypeId,
      quantityM3: pouringItems.quantityM3,
      pricePerM3: pouringItems.pricePerM3,
      total: pouringItems.total,
      concreteTypeName: concreteTypes.name,
      concreteTypePrice: concreteTypes.pricePerM3,
    })
      .from(pouringItems)
      .leftJoin(concreteTypes, eq(pouringItems.concreteTypeId, concreteTypes.id))
      .where(inArray(pouringItems.pouringId, pouringIds))
      .orderBy(asc(pouringItems.sortOrder))
      .all();

    const itemsMap: Record<number, any[]> = {};
    for (const item of allItems) {
      if (!itemsMap[item.pouringId]) itemsMap[item.pouringId] = [];
      itemsMap[item.pouringId].push(item);
    }
    for (const p of result) {
      (p as any).items = itemsMap[p.id] || [];
      const its = itemsMap[p.id] || [];
      (p as any).quantityM3 = its.reduce((s: number, i: any) => s + (i.quantityM3 || 0), 0);
      (p as any).total = its.reduce((s: number, i: any) => s + (i.total || 0), 0);
    }
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = actCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  const data = parsed.data;

  const refError = checkActRefs(data.siteId, data.offerId ?? null);
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  const totalQty = data.items.reduce((s, i) => s + i.quantityM3, 0);

  const pouring = db.transaction((tx) => {
    const p = tx.insert(pourings).values({
      siteId: data.siteId,
      offerId: data.offerId ?? null,
      date: data.date,
      concreteTypeId: data.items[0].concreteTypeId,
      quantityM3: totalQty,
      machineId: data.machineId ?? null,
      weather: data.weather || null,
      notes: data.notes || null,
      status: "completed",
    }).returning().get();

    data.items.forEach((item, i) => {
      tx.insert(pouringItems).values({
        pouringId: p.id,
        concreteTypeId: item.concreteTypeId,
        quantityM3: item.quantityM3,
        pricePerM3: item.pricePerM3,
        total: roundMoney(item.quantityM3 * item.pricePerM3),
        sortOrder: i,
      }).run();
    });

    return p;
  });

  return NextResponse.json(pouring, { status: 201 });
}
