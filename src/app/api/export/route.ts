import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/db";
import { clients, sites, offers, pourings, invoices, machines, workers, materials } from "@/db/schema";

export const dynamic = "force-dynamic";

// GET /api/export?table=clients&format=csv (admin only)
export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table") || "clients";
  const format = searchParams.get("format") || "csv";

  let data: any[] = [];

  switch (table) {
    case "clients":
      data = db.select().from(clients).all();
      break;
    case "sites":
      data = db.select().from(sites).all();
      break;
    case "offers":
      data = db.select().from(offers).all();
      break;
    case "pourings":
      data = db.select().from(pourings).all();
      break;
    case "invoices":
      data = db.select().from(invoices).all();
      break;
    case "machines":
      data = db.select().from(machines).all();
      break;
    case "workers":
      data = db.select().from(workers).all();
      break;
    case "materials":
      data = db.select().from(materials).all();
      break;
    default:
      return NextResponse.json({ error: "Unknown table" }, { status: 400 });
  }

  if (format === "csv") {
    return toCsv(data, table);
  }

  return NextResponse.json(data);
}

function toCsv(data: any[], filename: string) {
  if (data.length === 0) {
    return new NextResponse("", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  // BOM for Excel Cyrillic support
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((row) =>
    Object.values(row)
      .map((v) => {
        if (v === null || v === undefined) return "";
        const s = String(v);
        // Escape commas and quotes
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(",")
  );

  const csv = "\uFEFF" + [headers, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
