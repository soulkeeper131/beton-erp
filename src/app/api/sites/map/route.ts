import { NextResponse } from "next/server";
import { db } from "@/db";
import { sites } from "@/db/schema";

export const dynamic = 'force-dynamic';

export async function GET() {
  const allSites = await db
    .select({
      id: sites.id,
      name: sites.name,
      address: sites.address,
      latitude: sites.latitude,
      longitude: sites.longitude,
    })
    .from(sites)
    .all();

  const withCoords = allSites.filter(s => s.latitude != null && s.longitude != null);
  return NextResponse.json(withCoords);
}
