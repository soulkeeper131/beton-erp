import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { previewNumber } from "@/lib/invoices-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const direction = searchParams.get("direction") === "incoming" ? "incoming" : "outgoing";

  // Изходящите получават номера при издаване — това е номерът, който ще се даде
  return NextResponse.json({ number: previewNumber(direction, searchParams.get("type") || "invoice") });
}
