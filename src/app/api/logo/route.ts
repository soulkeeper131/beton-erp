import { NextResponse } from "next/server";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { readFileSync, existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = db.select().from(companySettings).limit(1).get();
  const logoPath = settings?.logoPath;

  if (!logoPath) {
    return new NextResponse(null, { status: 404 });
  }

  const fullPath = path.join(process.cwd(), logoPath);
  if (!existsSync(fullPath)) {
    return new NextResponse(null, { status: 404 });
  }

  const buffer = readFileSync(fullPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
