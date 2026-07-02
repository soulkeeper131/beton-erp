"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useIsAdmin } from "@/lib/use-is-admin";
import {
  ArrowLeft,
  FileText,
  Pencil,
  Trash2,
  Loader2,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { EmailDialog } from "@/components/email-dialog";

type OfferItem = {
  id: number;
  offerId: number;
  concreteTypeId: number | null;
  quantityM3: number;
  pricePerM3: number;
  transportCost: number;
  pumpCost: number;
  total: number;
  concreteTypeName: string | null;
  concreteTypeClassName: string | null;
};

type Offer = {
  id: number;
  number: string;
  date: string;
  validUntil: string | null;
  total: number;
  status: string;
  notes: string | null;
  clientId: number;
  siteId: number | null;
  clientName: string | null;
  clientCompany: string | null;
  clientEik: string | null;
  clientVatNumber: string | null;
  clientAddress: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  items: OfferItem[];
};

const statusLabels: Record<string, string> = {
  draft: "Чернова",
  sent: "Изпратена",
  accepted: "Приета",
  rejected: "Отказана",
};

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function OfferDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isAdmin = useIsAdmin();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchOffer = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/offers/${id}`);
    if (res.ok) {
      const data = await res.json();
      setOffer(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchOffer();
  }, [fetchOffer]);

  const handleStatusChange = async (newStatus: string) => {
    await fetch(`/api/offers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOffer();
  };

  const handleDelete = async () => {
    if (!confirm("Сигурни ли сте, че искате да изтриете тази оферта?")) return;
    setDeleting(true);
    await fetch(`/api/offers/${id}`, { method: "DELETE" });
    router.push("/offers");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Офертата не е намерена.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/offers")}>
          Обратно към списъка
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{offer.number}</h1>
            <p className="text-muted-foreground text-sm">
              {formatDate(offer.date)}
              {offer.validUntil && ` — Валидна до ${formatDate(offer.validUntil)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/offers/${offer.id}/pdf`} target="_blank" rel="noopener">
              <FileText className="h-4 w-4 mr-1" /> PDF
            </a>
          </Button>
          <EmailDialog
            defaultEmail={offer.clientEmail || ""}
            defaultSubject={`Оферта ${offer.number}`}
            getPdfBase64={async () => {
              const r = await fetch(`/api/offers/${offer.id}/pdf`);
              if (!r.ok) return null;
              const buf = await r.arrayBuffer();
              const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
              return { base64, filename: `Оферта-${offer.number}.pdf` };
            }}
          />
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/offers/${offer.id}/edit`)}>
              <Pencil className="h-4 w-4 mr-1" /> Редактирай
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Изтрий
            </Button>
          )}
        </div>
      </div>

      {/* Status & Client cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Статус</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                  statusColors[offer.status] || ""
                }`}
              >
                {statusLabels[offer.status] || offer.status}
              </span>
              {isAdmin && (
                <Select value={offer.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[160px] h-8">
                    <SelectValue placeholder="Смени статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Чернова</SelectItem>
                    <SelectItem value="sent">Изпратена</SelectItem>
                    <SelectItem value="accepted">Приета</SelectItem>
                    <SelectItem value="rejected">Отказана</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Клиент</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">
              {offer.clientCompany || offer.clientName}
            </p>
            {offer.clientCompany && offer.clientName && (
              <p className="text-muted-foreground">{offer.clientName}</p>
            )}
            {offer.clientEik && (
              <p className="text-muted-foreground">ЕИК: {offer.clientEik}</p>
            )}
            {offer.clientVatNumber && (
              <p className="text-muted-foreground">
                ДДС №: {offer.clientVatNumber}
              </p>
            )}
            {offer.clientAddress && (
              <p className="text-muted-foreground">{offer.clientAddress}</p>
            )}
            {offer.clientPhone && (
              <p className="text-muted-foreground">📞 {offer.clientPhone}</p>
            )}
            {offer.clientEmail && (
              <p className="text-muted-foreground">✉️ {offer.clientEmail}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Редове в офертата</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {offer.items.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Няма добавени редове.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">№</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">К-во (m³)</TableHead>
                    <TableHead className="text-right">Ед. цена</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">
                      Транспорт
                    </TableHead>
                    <TableHead className="text-right hidden sm:table-cell">
                      Помпа
                    </TableHead>
                    <TableHead className="text-right">Общо</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offer.items.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.concreteTypeName || "—"}
                        {item.concreteTypeClassName && (
                          <span className="text-xs text-muted-foreground block">
                            {item.concreteTypeClassName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.quantityM3.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(item.pricePerM3)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden sm:table-cell">
                        {formatCurrency(item.transportCost)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden sm:table-cell">
                        {formatCurrency(item.pumpCost)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total */}
      <Card>
        <CardContent className="flex justify-end py-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Сума без ДДС</div>
            <div className="text-2xl font-bold">{formatCurrency(offer.total)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {offer.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Бележки</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{offer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
