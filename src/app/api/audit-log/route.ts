import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const getDb = () => {
  const dbPath = path.join(process.cwd(), "data", "sqlite.db");
  return new Database(dbPath, { readonly: true });
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const entityType = searchParams.get("entityType") || "";
  const action = searchParams.get("action") || "";
  const userId = searchParams.get("userId") || "";

  const db = getDb();
  try {
    let where = "WHERE 1=1";
    const params: any[] = [];

    if (entityType) { where += " AND a.entity_type = ?"; params.push(entityType); }
    if (action) { where += " AND a.action = ?"; params.push(action); }
    if (userId) { where += " AND a.user_id = ?"; params.push(parseInt(userId)); }

    const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM audit_log a ${where}`).get(...params) as any;
    const total = countRow.cnt;

    const offset = (page - 1) * limit;
    const rows = db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      ${where}
      ORDER BY a.timestamp DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    // Get distinct entity types and actions for filters
    const entityTypes = db.prepare("SELECT DISTINCT entity_type FROM audit_log ORDER BY entity_type").all() as any[];
    const actions = db.prepare("SELECT DISTINCT action FROM audit_log ORDER BY action").all() as any[];

    return NextResponse.json({
      rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: {
        entityTypes: entityTypes.map((r: any) => r.entity_type),
        actions: actions.map((r: any) => r.action),
      },
    });
  } finally {
    db.close();
  }
}
