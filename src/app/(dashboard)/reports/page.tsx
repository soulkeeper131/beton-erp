"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

type ReportsData = {
  profitBySite: {
    siteId: number;
    siteName: string;
    clientName: string;
    status: string;
    revenue: number;
    laborCost: number;
    materialCost: number;
    totalCost: number;
    profit: number;
  }[];
  revenueByClient: {
    clientId: number;
    clientName: string;
    invoiced: number;
    incoming: number;
  }[];
  machineCosts: {
    machineId: number;
    machineName: string;
    type: string;
    maintenanceCount: number;
    totalCost: number;
    lastMaintenance: string | null;
  }[];
  materialsReport: {
    id: number;
    name: string;
    unit: string;
    quantity: number;
    minThreshold: number;
    pricePerUnit: number;
    stockValue: number;
    deliveriesCount: number;
    lastDelivery: string | null;
    low: boolean;
  }[];
  offeredVsActual: {
    offerId: number;
    number: string;
    clientName: string;
    status: string;
    offeredM3: number;
    offeredTotal: number;
    actualM3: number;
    actualTotal: number;
  }[];
};

function Number({ v }: { v: number }) {
  const cls = v < 0 ? "text-red-600" : v > 0 ? "text-green-700" : "";
  return <span className={cls}>{formatCurrency(v)}</span>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setData)
      .catch(() => setError("Грешка при зареждане"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10 text-muted-foreground">Зареждане...</div>;
  if (error) return <p className="text-destructive text-center py-10">{error}</p>;
  if (!data) return null;

  const totalProfit = data.profitBySite.reduce((a, s) => a + s.profit, 0);
  const totalRevenue = data.profitBySite.reduce((a, s) => a + s.revenue, 0);
  const totalMachineCost = data.machineCosts.reduce((a, m) => a + m.totalCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 Справки</h1>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard title="Общ приход (актове)" value={formatCurrency(totalRevenue)} icon="💰" />
        <KpiCard title="Обща печалба" value={<Number v={totalProfit} />} icon="📈" />
        <KpiCard title="Разходи машини" value={formatCurrency(totalMachineCost)} icon="🔧" />
      </div>

      <Tabs defaultValue="profit">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profit">🏗️ Печалба по обект</TabsTrigger>
          <TabsTrigger value="clients">👥 Оборот по клиент</TabsTrigger>
          <TabsTrigger value="machines">🚛 Разходи по машина</TabsTrigger>
          <TabsTrigger value="materials">📦 Материали</TabsTrigger>
          <TabsTrigger value="offered">📋 Офертирано vs Актувано</TabsTrigger>
        </TabsList>

        {/* Печалба по обект */}
        <TabsContent value="profit">
          <Card>
            <CardHeader><CardTitle className="text-base">Печалба по обект (приход − труд − материали)</CardTitle></CardHeader>
            <CardContent className="p-0">
              {data.profitBySite.length === 0 ? (
                <Empty text="Няма обекти" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Обект</TableHead>
                        <TableHead>Клиент</TableHead>
                        <TableHead className="text-right">Приход</TableHead>
                        <TableHead className="text-right">Труд</TableHead>
                        <TableHead className="text-right">Материали</TableHead>
                        <TableHead className="text-right">Печалба</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.profitBySite.map((s) => (
                        <TableRow key={s.siteId}>
                          <TableCell className="font-medium">{s.siteName}</TableCell>
                          <TableCell className="text-muted-foreground">{s.clientName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.revenue)}</TableCell>
                          <TableCell className="text-right">{s.laborCost ? formatCurrency(s.laborCost) : "—"}</TableCell>
                          <TableCell className="text-right">{s.materialCost ? formatCurrency(s.materialCost) : "—"}</TableCell>
                          <TableCell className="text-right font-semibold"><Number v={s.profit} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Оборот по клиент */}
        <TabsContent value="clients">
          <Card>
            <CardHeader><CardTitle className="text-base">Оборот по клиент (фактури)</CardTitle></CardHeader>
            <CardContent className="p-0">
              {data.revenueByClient.length === 0 ? (
                <Empty text="Няма клиенти" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Клиент</TableHead>
                        <TableHead className="text-right">Фактурирано (изходящо)</TableHead>
                        <TableHead className="text-right">Платено (входящо)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.revenueByClient.map((c) => (
                        <TableRow key={c.clientId}>
                          <TableCell className="font-medium">{c.clientName}</TableCell>
                          <TableCell className="text-right">{c.invoiced ? formatCurrency(c.invoiced) : "—"}</TableCell>
                          <TableCell className="text-right">{c.incoming ? formatCurrency(c.incoming) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Разходи по машина */}
        <TabsContent value="machines">
          <Card>
            <CardHeader><CardTitle className="text-base">Разходи по машина (поддръжка и ремонти)</CardTitle></CardHeader>
            <CardContent className="p-0">
              {data.machineCosts.length === 0 ? (
                <Empty text="Няма машини" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Машина</TableHead>
                        <TableHead className="text-right">Ремонти</TableHead>
                        <TableHead className="text-right">Общ разход</TableHead>
                        <TableHead>Последен</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.machineCosts.map((m) => (
                        <TableRow key={m.machineId}>
                          <TableCell className="font-medium">{m.machineName}</TableCell>
                          <TableCell className="text-right">{m.maintenanceCount}</TableCell>
                          <TableCell className="text-right font-semibold">{m.totalCost ? formatCurrency(m.totalCost) : "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{m.lastMaintenance || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Материали */}
        <TabsContent value="materials">
          <Card>
            <CardHeader><CardTitle className="text-base">Справка за материали</CardTitle></CardHeader>
            <CardContent className="p-0">
              {data.materialsReport.length === 0 ? (
                <Empty text="Няма материали" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Материал</TableHead>
                        <TableHead className="text-right">Наличност</TableHead>
                        <TableHead className="text-right">Мин.</TableHead>
                        <TableHead className="text-right">Цена/ед.</TableHead>
                        <TableHead className="text-right">Стойност</TableHead>
                        <TableHead className="text-right">Движения</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.materialsReport.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">
                            {m.name}
                            {m.low && <Badge variant="destructive" className="ml-2 text-xs">ниска</Badge>}
                          </TableCell>
                          <TableCell className="text-right">{m.quantity} {m.unit}</TableCell>
                          <TableCell className="text-right">{m.minThreshold || "—"}</TableCell>
                          <TableCell className="text-right">{m.pricePerUnit ? formatCurrency(m.pricePerUnit) : "—"}</TableCell>
                          <TableCell className="text-right">{m.stockValue ? formatCurrency(m.stockValue) : "—"}</TableCell>
                          <TableCell className="text-right">{m.deliveriesCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Офертирано vs Актувано */}
        <TabsContent value="offered">
          <Card>
            <CardHeader><CardTitle className="text-base">Офертирано vs Актувано</CardTitle></CardHeader>
            <CardContent className="p-0">
              {data.offeredVsActual.length === 0 ? (
                <Empty text="Няма оферти" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Оферта</TableHead>
                        <TableHead>Клиент</TableHead>
                        <TableHead className="text-right">Оферирано m³</TableHead>
                        <TableHead className="text-right">Актувано m³</TableHead>
                        <TableHead className="text-right">Оферирано €</TableHead>
                        <TableHead className="text-right">Актувано €</TableHead>
                        <TableHead>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.offeredVsActual.map((o) => {
                        const m3Pct = o.offeredM3 ? Math.round((o.actualM3 / o.offeredM3) * 100) : 0;
                        return (
                          <TableRow key={o.offerId}>
                            <TableCell className="font-medium">{o.number}</TableCell>
                            <TableCell className="text-muted-foreground">{o.clientName}</TableCell>
                            <TableCell className="text-right">{o.offeredM3}</TableCell>
                            <TableCell className="text-right">{o.actualM3}</TableCell>
                            <TableCell className="text-right">{formatCurrency(o.offeredTotal)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(o.actualTotal)}</TableCell>
                            <TableCell>
                              <Badge variant={o.actualM3 >= o.offeredM3 && o.offeredM3 > 0 ? "default" : "secondary"} className="text-xs">
                                {m3Pct}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ title, value, icon }: { title: string; value: React.ReactNode; icon: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
          </div>
          <span className="text-2xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="p-6 text-center text-muted-foreground text-sm">{text}</div>;
}
