import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  pourings, sites, clients, concreteTypes, machines,
  actWorkers, workers, companySettings,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { renderToStream } from "@react-pdf/renderer";
import { ActPDF } from "@/components/pdf/act-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pouringId = parseInt(params.id);

  const pouring = db
    .select({
      id: pourings.id,
      date: pourings.date,
      quantityM3: pourings.quantityM3,
      weather: pourings.weather,
      notes: pourings.notes,
      status: pourings.status,
      siteName: sites.name,
      siteCity: sites.city,
      clientName: clients.name,
      concreteTypeName: concreteTypes.name,
      machineName: machines.name,
    })
    .from(pourings)
    .leftJoin(sites, eq(pourings.siteId, sites.id))
    .leftJoin(clients, eq(sites.clientId, clients.id))
    .leftJoin(concreteTypes, eq(pourings.concreteTypeId, concreteTypes.id))
    .leftJoin(machines, eq(pourings.machineId, machines.id))
    .where(eq(pourings.id, pouringId))
    .get();

  if (!pouring) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pouringWorkers = db
    .select({
      workerName: workers.name,
      hours: actWorkers.hours,
    })
    .from(actWorkers)
    .leftJoin(workers, eq(actWorkers.workerId, workers.id))
    .where(eq(actWorkers.pouringId, pouringId))
    .all();

  const company = db.select().from(companySettings).get() || {};

  const stream = await renderToStream(
    ActPDF({ pouring: { ...pouring, workers: pouringWorkers }, company })
  );

  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="act-${pouring.id}.pdf"`,
    },
  });
}
