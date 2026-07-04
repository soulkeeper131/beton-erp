import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readFileSync, existsSync } from "fs";
import path from "path";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");

  if (!filePath) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  // Security: only allow files within the project's data directory
  const dataDir = path.join(process.cwd(), "data");
  const resolved = path.resolve(filePath);

  if (!resolved.startsWith(dataDir)) {
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
    },
  });
}
