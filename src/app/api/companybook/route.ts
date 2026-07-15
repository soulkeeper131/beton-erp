import { NextResponse } from "next/server";
import { db } from "@/db";
import { companySettings } from "@/db/schema";

export const dynamic = "force-dynamic";

const BASE = "https://api.companybook.bg/api";

export async function GET(req: Request) {
  let apiKey = process.env.COMPANYBOOK_API_KEY;
  if (!apiKey) {
    const settings = db.select({ key: companySettings.companybookApiKey }).from(companySettings).get();
    apiKey = settings?.key || "";
  }
  if (!apiKey) return NextResponse.json({ error: "COMPANYBOOK_API_KEY не е конфигуриран — задайте го в Настройки" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const eik = searchParams.get("eik")?.trim();

  if (!eik || !/^\d{9,13}$/.test(eik)) {
    return NextResponse.json({ error: "Невалиден ЕИК" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BASE}/companies/${eik}?with_data=true`, {
      headers: { "X-API-Key": apiKey },
    });
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.errorBG || data.errorEN || "Грешка" }, { status: 404 });
    }

    const c = data.company;
    const rawAddress = c.seat ? `${c.seat.settlement || ""}, ${c.seat.street || ""} ${c.seat.streetNumber || ""}`.trim().replace(/^,\s*/, "") : "";
    return NextResponse.json({
      eik: c.uic,
      name: c.companyName?.name || "",
      nameLatin: c.companyNameTransliteration?.name || "",
      legalForm: c.legalForm || "",
      status: c.status === "N" ? "Активна" : c.status === "L" ? "Ликвидирана" : c.status,
      address: rawAddress,
      city: c.seat?.settlement || "",
      postCode: c.seat?.postCode || "",
      vatNumber: `BG${c.uic}`,
    });
  } catch (e) {
    return NextResponse.json({ error: "Грешка при свързване с CompanyBook" }, { status: 502 });
  }
}
