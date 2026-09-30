import { NextResponse } from "next/server";
import { readdirSync, unlinkSync, statSync, mkdirSync } from "fs";
import path from "path";
import { requireAdmin } from "@/lib/auth-helpers";
import { isOffsiteConfigured, syncFilesToS3, uploadBackupToS3 } from "@/lib/offsite";
import Database from "better-sqlite3";
import { rawDb } from "@/db";

export const dynamic = "force-dynamic";

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");
const DB_PATH = path.join(process.cwd(), "data", "sqlite.db");
const MAX_BACKUPS = 7;

// GET /api/backup — list existing backups
export async function GET(req: Request) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    mkdirSync(BACKUP_DIR, { recursive: true });
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("beton-") && f.endsWith(".db"))
      .map(f => {
        const filePath = path.join(BACKUP_DIR, f);
        const stat = statSync(filePath);
        return {
          name: f,
          size: stat.size,
          date: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ backups: files, dbSize: statSync(DB_PATH).size });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/backup — create a new backup
export async function POST(req: Request) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    mkdirSync(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupName = `beton-${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Онлайн backup през better-sqlite3 (консистентен snapshot, WAL-safe)
    await rawDb.backup(backupPath);

    // Проверка, че копието е четимо — повреден backup не се води за успешен
    const check = new Database(backupPath, { readonly: true });
    try {
      const integrity = check.pragma("integrity_check", { simple: true });
      if (integrity !== "ok") throw new Error(`integrity_check: ${integrity}`);
    } finally {
      check.close();
    }

    // Rotate: keep only the last MAX_BACKUPS
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("beton-") && f.endsWith(".db"))
      .sort()
      .reverse();

    if (files.length > MAX_BACKUPS) {
      for (const old of files.slice(MAX_BACKUPS)) {
        unlinkSync(path.join(BACKUP_DIR, old));
      }
    }

    const stat = statSync(backupPath);

    // Offsite upload (ако е конфигуриран) — не блокира локалния backup при грешка
    let offsite: { url: string; size: number } | null = null;
    let offsiteError: string | null = null;
    let offsiteFiles: { uploaded: number; skipped: number } | null = null;
    if (isOffsiteConfigured()) {
      try {
        offsite = await uploadBackupToS3(backupPath, `beton-erp/${backupName}`);
        // Снимките и PDF-ите на входящите фактури не са в базата — качват се отделно
        offsiteFiles = await syncFilesToS3(path.join(process.cwd(), "data"));
      } catch (err: any) {
        offsiteError = err.message;
      }
    }

    return NextResponse.json({
      success: true,
      backup: { name: backupName, size: stat.size, date: stat.mtime.toISOString() },
      totalBackups: Math.min(files.length, MAX_BACKUPS),
      offsite: offsite
        ? { uploaded: true, url: offsite.url, size: offsite.size, files: offsiteFiles }
        : { uploaded: false, configured: isOffsiteConfigured(), error: offsiteError },
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Backup failed: ${err.message}` }, { status: 500 });
  }
}
