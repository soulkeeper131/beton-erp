import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, readdirSync, unlinkSync, statSync, mkdirSync } from "fs";
import path from "path";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");
const DB_PATH = path.join(process.cwd(), "data", "sqlite.db");
const MAX_BACKUPS = 7;

// GET /api/backup — list existing backups
export async function GET() {
  const session = await requireAdmin();
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
export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    mkdirSync(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupName = `beton-${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Use sqlite3 .backup command for consistent backup
    execSync(`sqlite3 "${DB_PATH}" ".backup '${backupPath}'"`, { timeout: 30000 });

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
    return NextResponse.json({
      success: true,
      backup: { name: backupName, size: stat.size, date: stat.mtime.toISOString() },
      totalBackups: Math.min(files.length, MAX_BACKUPS),
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Backup failed: ${err.message}` }, { status: 500 });
  }
}
