import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { offers, offerItems, clients, concreteTypes } from "@/db/schema";
import { eq } from "drizzle-orm";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "BGN",
  }).format(amount);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offerId = parseInt(params.id);

  const offer = db
    .select({
      id: offers.id,
      number: offers.number,
      date: offers.date,
      validUntil: offers.validUntil,
      total: offers.total,
      status: offers.status,
      notes: offers.notes,
      clientName: clients.name,
      clientCompany: clients.companyName,
      clientEik: clients.eik,
      clientVatNumber: clients.vatNumber,
      clientAddress: clients.address,
      clientPhone: clients.phone,
      clientEmail: clients.email,
    })
    .from(offers)
    .leftJoin(clients, eq(offers.clientId, clients.id))
    .where(eq(offers.id, offerId))
    .get();

  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = db
    .select({
      id: offerItems.id,
      quantityM3: offerItems.quantityM3,
      pricePerM3: offerItems.pricePerM3,
      transportCost: offerItems.transportCost,
      pumpCost: offerItems.pumpCost,
      total: offerItems.total,
      concreteTypeName: concreteTypes.name,
      concreteTypeClassName: concreteTypes.className,
    })
    .from(offerItems)
    .leftJoin(concreteTypes, eq(offerItems.concreteTypeId, concreteTypes.id))
    .where(eq(offerItems.offerId, offerId))
    .all();

  const clientDisplay = offer.clientCompany || offer.clientName || "—";

  const itemsRows = items
    .map(
      (item, idx) => `
    <tr>
      <td class="num">${idx + 1}</td>
      <td>${item.concreteTypeName || "—"}${item.concreteTypeClassName ? `<br><small>${item.concreteTypeClassName}</small>` : ""}</td>
      <td class="num">${item.quantityM3.toFixed(2)} m³</td>
      <td class="num">${formatCurrency(item.pricePerM3)}</td>
      <td class="num">${formatCurrency(item.total)}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Оферта ${offer.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "DejaVu Sans", "Helvetica Neue", Arial, sans-serif;
      color: #1a1a1a;
      font-size: 13px;
      line-height: 1.5;
      padding: 40px 50px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #2563eb;
    }
    .company-name { font-size: 22px; font-weight: 700; color: #2563eb; }
    .company-details { font-size: 11px; color: #666; }
    .offer-number { font-size: 20px; font-weight: 700; text-align: right; }
    .offer-date { font-size: 12px; color: #666; text-align: right; }
    .section { margin-bottom: 25px; }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    .info-grid { display: flex; gap: 40px; }
    .info-block { flex: 1; }
    .info-block p { margin-bottom: 3px; }
    .info-block .label { font-size: 10px; color: #888; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #f8fafc; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
    .num { text-align: right; white-space: nowrap; }
    .total-row td { font-weight: 700; font-size: 14px; border-top: 2px solid #2563eb; border-bottom: none; padding-top: 12px; }
    .notes { font-size: 12px; color: #555; white-space: pre-wrap; margin-top: 30px; padding: 10px; background: #f8fafc; border-radius: 4px; }
    .footer { margin-top: 40px; font-size: 10px; color: #aaa; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }

    @media print {
      body { padding: 20px 30px; }
      .no-print { display: none !important; }
      @page { margin: 15mm; size: A4; }
    }
    .print-btn {
      display: inline-block;
      margin-bottom: 20px;
      padding: 8px 20px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    .print-btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Принтирай / Запази като PDF</button>

  <div class="header">
    <div>
      <div class="company-name">BLV Systems</div>
      <div class="company-details">Бетонови разтвори и логистични услуги</div>
    </div>
    <div>
      <div class="offer-number">${offer.number}</div>
      <div class="offer-date">${formatDate(offer.date)}${offer.validUntil ? ` — Валидна до ${formatDate(offer.validUntil)}` : ""}</div>
    </div>
  </div>

  <div class="section">
    <div class="info-grid">
      <div class="info-block">
        <div class="section-title">Клиент</div>
        <p><strong>${clientDisplay}</strong></p>
        ${offer.clientEik ? `<p>ЕИК: ${offer.clientEik}</p>` : ""}
        ${offer.clientVatNumber ? `<p>ДДС №: ${offer.clientVatNumber}</p>` : ""}
        ${offer.clientAddress ? `<p>${offer.clientAddress}</p>` : ""}
        ${offer.clientPhone ? `<p>📞 ${offer.clientPhone}</p>` : ""}
        ${offer.clientEmail ? `<p>✉️ ${offer.clientEmail}</p>` : ""}
      </div>
      <div class="info-block">
        <div class="section-title">Доставчик</div>
        <p><strong>BLV Systems</strong></p>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Редове</div>
    <table>
      <thead>
        <tr>
          <th style="width:30px">№</th>
          <th>Описание</th>
          <th class="num">К-во (m³)</th>
          <th class="num">Ед. цена</th>
          <th class="num">Общо</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
        <tr class="total-row">
          <td colspan="4" style="text-align:right">Обща сума без ДДС:</td>
          <td class="num">${formatCurrency(offer.total)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${offer.notes ? `<div class="notes"><strong>Бележки:</strong><br>${offer.notes}</div>` : ""}

  <div class="footer">
    BLV Systems &copy; ${new Date().getFullYear()} — Генерирано на ${formatDate(new Date().toISOString())}
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
