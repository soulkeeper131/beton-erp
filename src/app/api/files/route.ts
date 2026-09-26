import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { isInside } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { session, isApiKey } = await getAuth(req);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");

  if (!filePath) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  // Само PDF-и на входящи фактури. Преди се пускаше всичко под data/ — вкл. самата
  // база sqlite.db (пароли, ключове) и backup-ите — на всеки вписан потребител.
  const allowedDir = path.join(process.cwd(), "data", "incoming-invoices");
  const resolved = path.resolve(process.cwd(), filePath.replace(/^\/+(?=data\/)/, ""));
  if (!isInside(allowedDir, resolved) || !resolved.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!existsSync(resolved)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buffer = readFileSync(resolved);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
