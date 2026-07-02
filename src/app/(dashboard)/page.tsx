"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DashboardData = {
  monthlyRevenue: number;
  openOffers: number;
  unpaidInvoices: number;
  activeSites: number;
  workersToday: number;
  totalPouringsM3: number;
  upcomingCalendar: {
    date: string;
    siteName: string | null;
    concreteType: string | null;
    estimatedM3: number | null;
    status: string;
  }[];
  expiringDocs: {
    machineName: string;
    type: string;
    expiryDate: string;
    status: string;
  }[];
  lowStock: {
    name: string;
    quantity: number;
    unit: string;
    minThreshold: number;
  }[];
};

const docTypeLabels: Record<string, string> = {
  vignette: "Винетка",
  insurance: "ГО",
  tech: "Тех. преглед",
};

const docTypeIcons: Record<string, string> = {
  vignette: "🛣️",
  insurance: "🛡️",
  tech: "🔧",
};

export default function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setData)
      .catch(() => setError("Грешка при зареждане"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <p className="text-destructive text-center py-10">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Табло</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          title="Оборот (месец)"
          value={`€${data.monthlyRevenue.toLocaleString("bg-BG")}`}
          icon="💰"
        />
        <KpiCard title="Отворени оферти" value={data.openOffers} icon="📋" />
        <KpiCard title="Неизплатени" value={data.unpaidInvoices} icon="⚠️" />
        <KpiCard title="Активни обекти" value={data.activeSites} icon="🏗️" />
        <KpiCard title="Работници днес" value={data.workersToday} icon="👷" />
        <KpiCard
          title="Излят бетон"
          value={`${data.totalPouringsM3} m³`}
          icon="🪣"
        />
      </div>

      {/* Two-column section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming schedule */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              📅 Предстоящи наряди (7 дни)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingCalendar.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Няма планирани наряди
              </p>
            ) : (
              <div className="space-y-2">
                {data.upcomingCalendar.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{e.siteName || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.date} · {e.concreteType || "—"} ·{" "}
                        {e.estimatedM3 || 0} m³
                      </p>
                    </div>
                    <Badge
                      variant={
                        e.status === "confirmed" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {e.status === "confirmed" ? "Потвърден" : "Планиран"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring docs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              🚨 Изтичащи документи (30 дни)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.expiringDocs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Всички документи са актуални ✅
              </p>
            ) : (
              <div className="space-y-2">
                {data.expiringDocs.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span>{docTypeIcons[e.type]}</span>
                      <div>
                        <p className="font-medium">{e.machineName}</p>
                        <p className="text-xs text-muted-foreground">
                          {docTypeLabels[e.type]} · {e.expiryDate}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        e.status === "expired" ? "destructive" : "secondary"
                      }
                      className="text-xs"
                    >
                      {e.status === "expired" ? "Изтекъл" : "Скоро"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low stock */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📦 Ниски наличности</CardTitle>
        </CardHeader>
        <CardContent>
          {data.lowStock.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Всички наличности са над минимума ✅
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {data.lowStock.map((m, i) => (
                <Badge key={i} variant="destructive" className="text-xs px-3 py-1.5">
                  {m.name}: {m.quantity} {m.unit} (мин: {m.minThreshold})
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: string;
}) {
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-24 bg-muted rounded" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
      <div className="h-16 bg-muted rounded-xl" />
    </div>
  );
}
