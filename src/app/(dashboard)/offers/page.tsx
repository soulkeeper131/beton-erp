"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";

type Offer = {
  id: number;
  number: string;
  date: string;
  validUntil: string | null;
  total: number;
  status: string;
  clientId: number;
  siteId: number | null;
  clientName: string | null;
  clientCompany: string | null;
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

export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchOffers = useCallback(async (status: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    const res = await fetch(`/api/offers?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setOffers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOffers(statusFilter);
  }, [statusFilter, fetchOffers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Оферти</h1>
        <Button onClick={() => router.push("/offers/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Нова оферта
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">Всички</TabsTrigger>
          <TabsTrigger value="draft">Чернови</TabsTrigger>
          <TabsTrigger value="sent">Изпратени</TabsTrigger>
          <TabsTrigger value="accepted">Приети</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Зареждане...</div>
          ) : offers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Няма намерени оферти.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Номер</TableHead>
                    <TableHead className="hidden md:table-cell">Клиент</TableHead>
                    <TableHead className="hidden md:table-cell">Дата</TableHead>
                    <TableHead className="hidden lg:table-cell">Сума</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <TableRow
                      key={offer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/offers/${offer.id}`)}
                    >
                      <TableCell className="font-medium">{offer.number}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {offer.clientCompany || offer.clientName || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(offer.date)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatCurrency(offer.total)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            statusColors[offer.status] || ""
                          }`}
                        >
                          {statusLabels[offer.status] || offer.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
