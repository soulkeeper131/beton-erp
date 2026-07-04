import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "data", "uploads");
  mkdirSync(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop() || "png";
  const filename = `logo.${ext}`;
  const filePath = path.join(uploadDir, filename);
  writeFileSync(filePath, buffer);

  // Update settings
  const existing = db.select().from(companySettings).limit(1).get();
  if (existing) {
    db.update(companySettings).set({ logoPath: `/data/uploads/${filename}` }).run();
  } else {
    db.insert(companySettings).values({ logoPath: `/data/uploads/${filename}` }).run();
  }

  return NextResponse.json({ logoPath: `/data/uploads/${filename}` });
}
