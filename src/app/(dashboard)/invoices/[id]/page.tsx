"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices/${params.id}`).then(r => r.json()).then(d => {
      if (d.error) router.push("/invoices");
      else setInvoice(d);
      setLoading(false);
    });
  }, [params.id, router]);

  if (loading) return <div className="flex justify-center py-20 text-muted-foreground">Зареждане...</div>;
  if (!invoice) return <div className="flex justify-center py-20 text-muted-foreground">Не е намерена</div>;

  const typeLabels: Record<string, string> = {
    invoice: "Фактура", proforma: "Проформа фактура",
    credit_note: "Кредитно известие", debit_note: "Дебитно известие"
  };
  const directionLabels: Record<string, string> = { incoming: "Входяща", outgoing: "Изходяща" };
  const paymentLabels: Record<string, string> = { unpaid: "Неплатено", partial: "Частично", paid: "Платено" };
  const methodLabels: Record<string, string> = { bank: "Банков превод", cash: "В брой", card: "Карта" };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.push("/invoices")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Назад
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{typeLabels[invoice.type] || invoice.type} №{invoice.number}</h1>
          <p className="text-muted-foreground">{directionLabels[invoice.direction]} • {invoice.currency}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatCurrency(invoice.total)} {invoice.currency}</div>
          <span className="text-sm text-muted-foreground">{paymentLabels[invoice.paymentStatus]}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Детайли</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Дата:</dt><dd>{formatDate(invoice.date)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Падеж:</dt><dd>{formatDate(invoice.dueDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Дан. събитие:</dt><dd>{formatDate(invoice.taxEventDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Начин на плащане:</dt><dd>{methodLabels[invoice.paymentMethod] || invoice.paymentMethod}</dd></div>
              {invoice.taxExemptionReason && (
                <div className="flex justify-between"><dt className="text-muted-foreground">Основание за 0% ДДС:</dt><dd>{invoice.taxExemptionReason}</dd></div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Клиент</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Име:</dt><dd>{invoice.clientName}</dd></div>
              {invoice.clientCompany && <div className="flex justify-between"><dt className="text-muted-foreground">Фирма:</dt><dd>{invoice.clientCompany}</dd></div>}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Редове</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2">Описание</th>
                <th className="py-2 text-right">К-во</th>
                <th className="py-2 text-right">Цена</th>
                <th className="py-2 text-right">ДДС</th>
                <th className="py-2 text-right">Сума</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item: any) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right">{item.quantity} {item.unit}</td>
                  <td className="py-2 text-right">{formatCurrency(item.price)}</td>
                  <td className="py-2 text-right">{item.vatRate}%</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="space-y-2 text-right">
            <div className="text-muted-foreground">Сума без ДДС: {formatCurrency(invoice.subtotal)}</div>
            {invoice.discountPercent > 0 && <div className="text-muted-foreground">Отстъпка {invoice.discountPercent}%</div>}
            {invoice.discountAmount > 0 && <div className="text-muted-foreground">Отстъпка: {formatCurrency(invoice.discountAmount)}</div>}
            <div className="text-muted-foreground">ДДС ({invoice.vatRate}%): {formatCurrency(invoice.vatAmount)}</div>
            <div className="text-xl font-bold">Общо: {formatCurrency(invoice.total)} {invoice.currency}</div>
          </div>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Бележки</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{invoice.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
