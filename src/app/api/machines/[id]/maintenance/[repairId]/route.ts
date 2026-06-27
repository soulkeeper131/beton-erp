import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; repairId: string } }
) {
  const db = new Database(path.join(process.cwd(), "data", "sqlite.db"));
  db.prepare("DELETE FROM machine_maintenance WHERE id = ? AND machine_id = ?")
    .run(parseInt(params.repairId), parseInt(params.id));
  db.close();
  return NextResponse.json({ success: true });
}
