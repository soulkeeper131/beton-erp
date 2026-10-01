"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EmailDialog } from "@/components/email-dialog";
import { bufferToBase64 } from "@/lib/base64";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function patch(data: Record<string, string>) {
    setBusy(true);
    const r = await fetch(`/api/invoices/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const d = await r.json().catch(() => null);
    if (r.ok) setInvoice((prev: any) => ({ ...prev, ...d }));
    else alert(d?.error || "Грешка");
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Да изтрия ли черновата?")) return;
    setBusy(true);
    const r = await fetch(`/api/invoices/${params.id}`, { method: "DELETE" });
    if (r.ok) router.push("/invoices");
    else {
      alert((await r.json().catch(() => null))?.error || "Грешка");
      setBusy(false);
    }
  }

  function reload() {
    return fetch(`/api/invoices/${params.id}`).then(r => r.json()).then(d => {
      if (d.error) router.push("/invoices");
      else setInvoice(d);
      setLoading(false);
    });
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) return <div className="flex justify-center py-20 text-muted-foreground">Зареждане...</div>;
  if (!invoice) return <div className="flex justify-center py-20 text-muted-foreground">Не е намерена</div>;

  const typeLabels: Record<string, string> = { invoice: "Фактура", proforma: "Проформа фактура", credit_note: "Кредитно известие", debit_note: "Дебитно известие" };
  const directionLabels: Record<string, string> = { incoming: "Входяща", outgoing: "Изходяща" };
  const paymentLabels: Record<string, string> = { unpaid: "Неплатено", partial: "Частично", paid: "Платено" };
  const methodLabels: Record<string, string> = { bank: "Банков превод", cash: "В брой", card: "Карта" };
  const c = invoice.company || {};
  const incoming = invoice.direction === "incoming";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.push("/invoices")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Назад</Button>

      <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
        {invoice.status === "draft" ? (
          <>
            <span className="font-medium">Чернова</span>
            <span className="text-muted-foreground">
              — не участва в оборота{invoice.nextNumber ? `; при издаване получава № ${invoice.nextNumber}` : ", докато не е издадена"}
            </span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" disabled={busy} onClick={async () => { await patch({ status: "sent" }); reload(); }}>✅ Издай</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => router.push(`/invoices/new?edit=${invoice.id}`)}>✏️ Редактирай</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={remove}>🗑️ Изтрий</Button>
            </div>
          </>
        ) : (
          <>
            <span className="font-medium">Издадена</span>
            <span className="text-muted-foreground">— корекции само с кредитно/дебитно известие</span>
            <div className="ml-auto flex gap-1">
              {(["unpaid", "partial", "paid"] as const).map((ps) => (
                <Button key={ps} size="sm" disabled={busy} variant={invoice.paymentStatus === ps ? "default" : "outline"} onClick={() => patch({ paymentStatus: ps })}>
                  {paymentLabels[ps]}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">
            {typeLabels[invoice.type] || invoice.type} {invoice.status === "draft" && invoice.direction === "outgoing" ? "(чернова)" : `№${invoice.number}`}
          </h1>
          <p className="text-muted-foreground">{directionLabels[invoice.direction]} • {invoice.currency}</p>
          {invoice.related && (
            <p className="text-sm">към фактура <a className="underline" href={`/invoices/${invoice.related.id}`}>№{invoice.related.number}</a> от {invoice.related.date}</p>
          )}
          {(invoice.creditNotes || []).map((n: any) => (
            <p key={n.id} className="text-sm">{typeLabels[n.type]} <a className="underline" href={`/invoices/${n.id}`}>{n.status === "draft" ? "(чернова)" : `№${n.number}`}</a> от {n.date} · {formatCurrency(n.total)}</p>
          ))}
          {invoice.status === "sent" && invoice.type === "invoice" && (
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => router.push(`/invoices/new?type=credit_note&related=${invoice.id}`)}>➖ Кредитно известие</Button>
              <Button size="sm" variant="outline" onClick={() => router.push(`/invoices/new?type=debit_note&related=${invoice.id}`)}>➕ Дебитно известие</Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener">
              <FileText className="h-4 w-4 mr-1" /> PDF
            </a>
          </Button>
          <EmailDialog
            defaultEmail={invoice.clientEmail || ""}
            defaultSubject={`Фактура ${invoice.number}`}
            getPdfBase64={async () => {
              const r = await fetch(`/api/invoices/${invoice.id}/pdf`);
              if (!r.ok) return null;
              const buf = await r.arrayBuffer();
              const base64 = bufferToBase64(buf);
              return { base64, filename: `Фактура-${invoice.number}.pdf` };
            }}
          />
          <div className="text-right">
          <div className="text-2xl font-bold">{formatCurrency(invoice.total)}</div>
          <span className="text-sm text-muted-foreground">{paymentLabels[invoice.paymentStatus]}</span>
        </div>
        </div>
      </div>

      {/* PDF preview for incoming drafts */}
      {invoice.pdfPath && invoice.direction === "incoming" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">📄 Оригинален документ</CardTitle></CardHeader>
          <CardContent>
            <iframe
              src={`/api/files?path=${encodeURIComponent(invoice.pdfPath)}`}
              className="w-full h-[500px] border rounded"
              title="Оригинален PDF"
            />
          </CardContent>
        </Card>
      )}

      {/* Доставчик + Получател */}
      {/* При входяща фактура доставчикът е контрагентът, а получателят — нашата фирма */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={incoming ? "order-2" : ""}>
          <CardHeader><CardTitle className="text-sm">{incoming ? "Получател" : "Доставчик"}</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-1 text-sm">
              {c.companyName && <div className="font-semibold">{c.companyName}</div>}
              {c.companyNameBG && c.companyNameBG !== c.companyName && <div>{c.companyNameBG}</div>}
              {c.eik && <div>ЕИК: {c.eik}</div>}
              {c.vatNumber && <div>ДДС №: {c.vatNumber}</div>}
              {c.address && <div>{c.city ? `${c.city}, ` : ""}{c.address}</div>}
              {c.mol && <div>МОЛ: {c.mol}</div>}
              {c.email && <div>✉️ {c.email}</div>}
              {c.phone && <div>📞 {c.phone}</div>}
              {c.bankName && <div className="pt-2 text-xs text-muted-foreground">Банка: {c.bankName}</div>}
              {c.iban && <div className="text-xs text-muted-foreground">IBAN: {c.iban}</div>}
              {c.bic && <div className="text-xs text-muted-foreground">BIC: {c.bic}</div>}
            </dl>
          </CardContent>
        </Card>

        <Card className={incoming ? "order-1" : ""}>
          <CardHeader><CardTitle className="text-sm">{incoming ? "Доставчик" : "Получател"}</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-1 text-sm">
              {invoice.clientCompany && <div className="font-semibold">{invoice.clientCompany}</div>}
              {invoice.clientName && <div>{invoice.clientName}</div>}
              {invoice.clientEik && <div>ЕИК: {invoice.clientEik}</div>}
              {invoice.clientVatNumber && <div>ДДС №: {invoice.clientVatNumber}</div>}
              {invoice.clientAddress && <div>{invoice.clientAddress}</div>}
              {invoice.clientPhone && <div>📞 {invoice.clientPhone}</div>}
              {invoice.clientEmail && <div>✉️ {invoice.clientEmail}</div>}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Детайли */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Детайли</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div><dt className="text-muted-foreground text-xs">Дата</dt><dd>{formatDate(invoice.date)}</dd></div>
            <div><dt className="text-muted-foreground text-xs">Падеж</dt><dd>{formatDate(invoice.dueDate)}</dd></div>
            <div><dt className="text-muted-foreground text-xs">Дан. събитие</dt><dd>{formatDate(invoice.taxEventDate)}</dd></div>
            <div><dt className="text-muted-foreground text-xs">Плащане</dt><dd>{methodLabels[invoice.paymentMethod]}</dd></div>
          </dl>
          {invoice.taxExemptionReason && <p className="mt-2 text-xs text-muted-foreground">Основание за 0% ДДС: {invoice.taxExemptionReason}</p>}
        </CardContent>
      </Card>

      {/* Редове */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Редове</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="py-2">Описание</th><th className="py-2 text-right">М.Е.</th><th className="py-2 text-right">К-во</th>
                <th className="py-2 text-right">Цена</th><th className="py-2 text-right">ДДС</th><th className="py-2 text-right">Сума</th>
              </tr></thead>
              <tbody>
                {invoice.items?.map((item: any) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right text-muted-foreground">{item.unit}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.price)}</td>
                    <td className="py-2 text-right">{item.vatRate}%</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {invoice.acts?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">📋 Фактурирани актове</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {invoice.acts.map((a: any) => (
              <div key={a.id} className="flex justify-between gap-2">
                <a href={`/pourings/${a.id}`} className="underline">Акт №{a.id} от {a.date}{a.siteName ? ` — ${a.siteName}` : ""}</a>
                <span className="text-muted-foreground">{(a.quantityM3 || 0).toFixed(2)} m³</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Тотали */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-1 text-right text-sm">
            <div className="text-muted-foreground">Сума без ДДС: {formatCurrency(invoice.subtotal)}</div>
            {invoice.discountPercent > 0 && <div className="text-muted-foreground">Отстъпка {invoice.discountPercent}%: -{formatCurrency(invoice.subtotal * invoice.discountPercent / 100)}</div>}
            {invoice.discountAmount > 0 && <div className="text-muted-foreground">Отстъпка: -{formatCurrency(invoice.discountAmount)}</div>}
            <div className="text-muted-foreground">ДДС ({invoice.vatRate}%): {formatCurrency(invoice.vatAmount)}</div>
            <div className="text-xl font-bold pt-1 border-t">Общо: {formatCurrency(invoice.total)}</div>
          </div>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card><CardHeader><CardTitle className="text-sm">Бележки</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap">{invoice.notes}</p></CardContent></Card>
      )}
    </div>
  );
}
