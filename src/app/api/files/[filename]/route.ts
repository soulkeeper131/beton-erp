import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { IMAGE_MIME, SAFE_FILE_HEADERS } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filename = params.filename;
  // Само имена, генерирани от системата (без пътища)
  if (!/^[\w.-]+$/.test(filename) || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "data", "uploads", filename);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    // SVG вече не се сервира като изображение (може да съдържа скрипт); неразпознатото
    // се сваля като файл, а не се показва
    const contentType = IMAGE_MIME[ext === "jpeg" ? "jpg" : ext] || "application/octet-stream";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
        ...(contentType === "application/octet-stream" ? { "Content-Disposition": "attachment" } : {}),
        ...SAFE_FILE_HEADERS,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
