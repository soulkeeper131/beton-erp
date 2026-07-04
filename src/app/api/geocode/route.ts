import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Free Nominatim API (OpenStreetMap) — 1 req/sec max, cache where possible
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) return NextResponse.json({ error: "lat and lng required" }, { status: 400 });

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=bg`;
    const res = await fetch(url, {
      headers: { "User-Agent": "BetonERP/1.0 (vladimir.jotov@gmail.com)" },
    });

    if (!res.ok) return NextResponse.json({ error: "Nominatim unavailable" }, { status: 502 });

    const data = await res.json() as any;
    const displayName = data?.display_name || "";
    const address = data?.address || {};

    return NextResponse.json({
      displayName,
      road: address.road || address.pedestrian || "",
      city: address.city || address.town || address.village || "",
      country: address.country || "",
    });
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
