import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { mapCompany } from "@/lib/companybook";

export const dynamic = "force-dynamic";

const BASE = "https://api.companybook.bg/api";

export async function GET(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;

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
    const data = await res.json().catch(() => ({}));

    if (data.error || !res.ok || !data.company) {
      const msg = data.errorBG || data.errorEN ||
        (res.status === 401 || res.status === 403 ? "Невалиден CompanyBook API ключ" :
         res.status === 429 ? "Лимитът на CompanyBook е изчерпан — опитайте по-късно" : "Фирмата не е намерена");
      return NextResponse.json({ error: msg }, { status: res.status === 429 ? 429 : 404 });
    }

    return NextResponse.json(mapCompany(data));
  } catch (e) {
    return NextResponse.json({ error: "Грешка при свързване с CompanyBook" }, { status: 502 });
  }
}
