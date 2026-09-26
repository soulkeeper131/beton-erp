import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { getNextInvoiceNumber } from "@/lib/invoice-number";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const direction = searchParams.get("direction") === "incoming" ? "incoming" : "outgoing";

  return NextResponse.json({ number: getNextInvoiceNumber(direction) });
}
