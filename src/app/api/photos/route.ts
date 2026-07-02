import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { actPhotos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const pouringId = searchParams.get("pouringId");
  const siteId = searchParams.get("siteId");

  let where: any = undefined;
  if (pouringId) where = eq(actPhotos.pouringId, parseInt(pouringId));
  else if (siteId) where = eq(actPhotos.siteId, parseInt(siteId));
  else return NextResponse.json({ error: "pouringId or siteId required" }, { status: 400 });

  const photos = await db.select().from(actPhotos).where(where).orderBy(actPhotos.uploadedAt).all();
  return NextResponse.json(photos);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const pouringId = formData.get("pouringId") as string | null;
  const siteId = formData.get("siteId") as string | null;
  const caption = formData.get("caption") as string | null;

  if (!file) return NextResponse.json({ error: "Файлът е задължителен" }, { status: 400 });
  if (!pouringId && !siteId) return NextResponse.json({ error: "pouringId или siteId е задължителен" }, { status: 400 });

  // Save file
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(UPLOAD_DIR, filename), buffer);

  // Save DB record
  const [photo] = await db
    .insert(actPhotos)
    .values({
      pouringId: pouringId ? parseInt(pouringId) : null,
      siteId: siteId ? parseInt(siteId) : null,
      filename,
      caption: caption || null,
    })
    .returning();

  return NextResponse.json(photo, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(actPhotos).where(eq(actPhotos.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}
