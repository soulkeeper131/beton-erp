import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const db = new Database(path.join(process.cwd(), "data", "sqlite.db"));
  const result = db.prepare(`
    INSERT INTO machine_maintenance (machine_id, date, type, description, cost, provider, mileage_at_repair, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    parseInt(params.id), body.date, body.type, body.description,
    body.cost || 0, body.provider || null, body.mileageAtRepair || null, body.notes || null
  );
  const row = db.prepare("SELECT * FROM machine_maintenance WHERE id = ?").get(result.lastInsertRowid);
  db.close();
  return NextResponse.json(row, { status: 201 });
}
