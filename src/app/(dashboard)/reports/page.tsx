"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { toCsv } from "@/lib/reports";

type ReportsData = {
  period: { from: string | null; to: string | null };
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
    delivered: number;
    consumed: number;
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

type Preset = "all" | "month" | "prevMonth" | "year" | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "all", label: "Всичко" },
  { value: "month", label: "Този месец" },
  { value: "prevMonth", label: "Миналия месец" },
  { value: "year", label: "Тази година" },
  { value: "custom", label: "Период…" },
];

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "month":
      return { from: isoDate(new Date(y, m, 1)), to: isoDate(new Date(y, m + 1, 0)) };
    case "prevMonth":
      return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) };
    case "year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    default:
      return { from: "", to: "" };
  }
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const blob = new Blob([toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("profit");
  const [preset, setPreset] = useState<Preset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    setLoading(true);
    setError("");
    fetch(`/api/reports?${qs}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject((await r.json().catch(() => null))?.error)))
      .then(setData)
      .catch((e) => {
        setData(null);
        setError(typeof e === "string" ? e : "Грешка при зареждане");
      })
      .finally(() => setLoading(false));
  }, [from, to]);

  function choosePreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") {
      const r = presetRange(p);
      setFrom(r.from);
      setTo(r.to);
    }
  }

  const periodLabel = from || to ? `${from || "…"} – ${to || "…"}` : "всички";

  function exportTab() {
    if (!data) return;
    const suffix = from || to ? `_${from || "nachalo"}_${to || "dnes"}` : "";
    switch (tab) {
      case "profit":
        return downloadCsv(`pechalba-po-obekt${suffix}.csv`,
          ["Обект", "Клиент", "Приход", "Труд", "Материали", "Печалба"],
          data.profitBySite.map((s) => [s.siteName, s.clientName, s.revenue, s.laborCost, s.materialCost, s.profit]));
      case "clients":
        return downloadCsv(`oborot-po-klient${suffix}.csv`,
          ["Клиент / доставчик", "Изходящи фактури", "Входящи фактури"],
          data.revenueByClient.map((c) => [c.clientName, c.invoiced, c.incoming]));
      case "machines":
        return downloadCsv(`razhodi-po-mashina${suffix}.csv`,
          ["Машина", "Ремонти", "Общ разход", "Последен"],
          data.machineCosts.map((m) => [m.machineName, m.maintenanceCount, m.totalCost, m.lastMaintenance]));
      case "materials":
        return downloadCsv(`materiali${suffix}.csv`,
          ["Материал", "Мярка", "Наличност", "Мин.", "Цена/ед.", "Стойност", "Доставено", "Изразходвано", "Бр. доставки"],
          data.materialsReport.map((m) => [m.name, m.unit, m.quantity, m.minThreshold, m.pricePerUnit, m.stockValue, m.delivered, m.consumed, m.deliveriesCount]));
      case "offered":
        return downloadCsv(`ofertirano-vs-aktuvano${suffix}.csv`,
          ["Оферта", "Клиент", "Статус", "Оферирано m³", "Актувано m³", "Оферирано €", "Актувано €"],
          data.offeredVsActual.map((o) => [o.number, o.clientName, o.status, o.offeredM3, o.actualM3, o.offeredTotal, o.actualTotal]));
    }
  }

  const filters = (
    <div className="flex flex-wrap items-end gap-2">
      {PRESETS.map((p) => (
        <Button key={p.value} size="sm" variant={preset === p.value ? "default" : "outline"} onClick={() => choosePreset(p.value)}>
          {p.label}
        </Button>
      ))}
      {preset === "custom" && (
        <>
          <Input type="date" className="w-40 h-9" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="От дата" />
          <Input type="date" className="w-40 h-9" value={to} onChange={(e) => setTo(e.target.value)} aria-label="До дата" />
        </>
      )}
    </div>
  );

  if (!data && loading) return <div className="text-center py-10 text-muted-foreground">Зареждане...</div>;
  if (!data)
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">📊 Справки</h1>
        {filters}
        <p className="text-destructive text-center py-10">{loading ? "" : error || "Грешка при зареждане"}</p>
      </div>
    );

  const totalProfit = data.profitBySite.reduce((a, s) => a + s.profit, 0);
  const totalRevenue = data.profitBySite.reduce((a, s) => a + s.revenue, 0);
  const totalMachineCost = data.machineCosts.reduce((a, m) => a + m.totalCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">📊 Справки</h1>
        <Button size="sm" variant="outline" onClick={exportTab}>⬇️ Експорт (Excel/CSV)</Button>
      </div>

      <div className="space-y-1">
        {filters}
        <p className="text-xs text-muted-foreground">
          Период: {periodLabel}
          {loading && " · зареждане…"}
          {error && <span className="text-destructive"> · {error}</span>}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard title="Общ приход (актове)" value={formatCurrency(totalRevenue)} icon="💰" />
        <KpiCard title="Обща печалба" value={<Number v={totalProfit} />} icon="📈" />
        <KpiCard title="Разходи машини" value={formatCurrency(totalMachineCost)} icon="🔧" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
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
            <CardHeader><CardTitle className="text-base">Печалба по обект (приход − труд − материали)</CardTitle>
              <p className="text-xs text-muted-foreground">По дата на акта. Не включва разходи за машини, транспорт и закупен бетон; материалите са по текущата им цена.</p></CardHeader>
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
            <CardHeader><CardTitle className="text-base">Оборот по клиент / доставчик (фактури)</CardTitle>
              <p className="text-xs text-muted-foreground">Без чернови и проформи; кредитните известия се изваждат.</p></CardHeader>
            <CardContent className="p-0">
              {data.revenueByClient.length === 0 ? (
                <Empty text="Няма клиенти" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Клиент / доставчик</TableHead>
                        <TableHead className="text-right">Изходящи фактури (приход)</TableHead>
                        <TableHead className="text-right">Входящи фактури (разход)</TableHead>
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
            <CardHeader><CardTitle className="text-base">Справка за материали</CardTitle>
              <p className="text-xs text-muted-foreground">Наличност и стойност — към днес. Доставено и изразходвано — за избрания период.</p></CardHeader>
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
                        <TableHead className="text-right">Доставено</TableHead>
                        <TableHead className="text-right">Изразходвано</TableHead>
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
                          <TableCell className="text-right" title={`${m.deliveriesCount} доставки`}>{m.delivered ? `${m.delivered} ${m.unit}` : "—"}</TableCell>
                          <TableCell className="text-right">{m.consumed ? `${m.consumed} ${m.unit}` : "—"}</TableCell>
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
            <CardHeader><CardTitle className="text-base">Офертирано vs Актувано</CardTitle>
              <p className="text-xs text-muted-foreground">Оферти по дата на офертата (без чернови); актуваното включва всички актове към офертата.</p></CardHeader>
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
