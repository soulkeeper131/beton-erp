import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { actPhotos, pourings, sites } from "@/db/schema";
import { detectImage, MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import exifreader from "exifreader";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = join(process.cwd(), "data", "uploads");

function extractGPS(buffer: Buffer): { latitude: number | null; longitude: number | null } {
  try {
    const tags = exifreader.load(buffer, { expanded: true });
    if (!tags.gps) return { latitude: null, longitude: null };

    const gps: any = tags.gps;
    const latVal = gps.Latitude?.value;
    const lngVal = gps.Longitude?.value;

    if (!latVal || !lngVal || !Array.isArray(latVal) || !Array.isArray(lngVal)) {
      return { latitude: null, longitude: null };
    }

    // Convert DMS [degrees, minutes, seconds] to decimal
    const toDecimal = (dms: number[]) => dms[0] + dms[1] / 60 + dms[2] / 3600;
    return {
      latitude: toDecimal(latVal),
      longitude: toDecimal(lngVal),
    };
  } catch {
    return { latitude: null, longitude: null };
  }
}

export async function GET(request: NextRequest) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const pouringId = formData.get("pouringId") as string | null;
  const siteId = formData.get("siteId") as string | null;
  const caption = formData.get("caption") as string | null;

  if (!file) return NextResponse.json({ error: "Файлът е задължителен" }, { status: 400 });
  if (!pouringId && !siteId) return NextResponse.json({ error: "pouringId или siteId е задължителен" }, { status: 400 });

  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Файлът е над 15 MB" }, { status: 400 });
  const buffer = Buffer.from(await file.arrayBuffer());
  // Типът се определя по съдържанието, не по името от клиента (без SVG/HTML)
  const kind = detectImage(buffer);
  if (!kind) return NextResponse.json({ error: "Позволени са само снимки (JPG, PNG, WEBP, GIF, HEIC)" }, { status: 400 });

  const pid = pouringId ? parseInt(pouringId) : null;
  const sid = siteId ? parseInt(siteId) : null;
  if (pid && !db.select({ id: pourings.id }).from(pourings).where(eq(pourings.id, pid)).get()) {
    return NextResponse.json({ error: "Актът не съществува" }, { status: 400 });
  }
  if (sid && !db.select({ id: sites.id }).from(sites).where(eq(sites.id, sid)).get()) {
    return NextResponse.json({ error: "Обектът не съществува" }, { status: 400 });
  }

  // Save file
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${kind.ext}`;
  await writeFile(join(UPLOAD_DIR, filename), buffer);

  // Extract GPS from EXIF
  const { latitude, longitude } = extractGPS(buffer);

  // Save DB record
  const [photo] = await db
    .insert(actPhotos)
    .values({
      pouringId: pid,
      siteId: sid,
      filename,
      caption: caption || null,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
    })
    .returning();

  if (latitude && longitude) {
    console.log(`Photo GPS: ${latitude}, ${longitude}`);
  }

  return NextResponse.json(photo, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { session, isApiKey } = await getAuth(request);
  if (!session && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(actPhotos).where(eq(actPhotos.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}
