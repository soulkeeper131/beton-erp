# Dashboard Implementation Plan

> **For Hermes:** Execute tasks sequentially. Each task builds on the previous.

**Goal:** Replace the placeholder Dashboard with a real-time KPI overview pulling aggregate data from all ERP modules.

**Architecture:** Single API route `/api/dashboard/stats` runs SQL aggregations across all tables, returns a typed JSON response. Dashboard page renders KPI cards, upcoming schedule, expiring documents, and low stock in a responsive grid.

**Tech Stack:** Drizzle ORM + SQLite, Next.js App Router, shadcn/ui Card/Badge, Tailwind CSS.

---

## Files to Touch

| Action | Path |
|--------|------|
| Create | `src/app/api/dashboard/stats/route.ts` |
| Replace | `src/app/(dashboard)/page.tsx` |
| Modify | (none, standalone feature) |

---

## API Response Shape

```typescript
{
  // KPI cards
  monthlyRevenue: number;        // SUM(invoices.total) for current month (EUR)
  openOffers: number;            // COUNT(offers) WHERE status IN ('draft','sent')
  unpaidInvoices: number;        // COUNT(invoices) WHERE payment_status != 'paid'
  activeSites: number;           // COUNT(sites) WHERE status = 'active'
  workersToday: number;          // COUNT(attendance) where date = today
  totalPouringsM3: number;       // SUM(pourings.quantityM3) for current month

  // Upcoming schedule (next 7 days)
  upcomingCalendar: { date, siteName, concreteType, estimatedM3, status }[];

  // Machines with expiring documents (within 30 days or expired)
  expiringDocs: { machineName, type: 'vignette'|'insurance'|'tech', expiryDate, status: 'expired'|'expiring' }[];

  // Low stock materials
  lowStock: { name, quantity, unit, minThreshold }[];
}
```

---

### Task 1: Create dashboard stats API

**Objective:** Add `GET /api/dashboard/stats` that returns all aggregated KPIs.

**File:** Create `src/app/api/dashboard/stats/route.ts`

**Implementation:**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, offers, sites, siteCalendar, pourings, machines, materials, workerAttendance } from "@/db/schema";
import { count, sum, and, gte, lte, eq, lt, or, ne, sql } from "drizzle-orm";

export async function GET() {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const thirtyDaysStr = thirtyDays.toISOString().split("T")[0];

  // KPI: monthly revenue
  const revResult = await db
    .select({ total: sum(invoices.total) })
    .from(invoices)
    .where(and(eq(invoices.status, "sent"), gte(invoices.date, monthStart)))
    .get();
  const monthlyRevenue = revResult?.total || 0;

  // KPI: open offers
  const offersResult = await db.select({ count: count() }).from(offers)
    .where(or(eq(offers.status, "draft"), eq(offers.status, "sent"))).get();
  const openOffers = offersResult?.count || 0;

  // KPI: unpaid invoices
  const unpaidResult = await db.select({ count: count() }).from(invoices)
    .where(and(eq(invoices.status, "sent"), ne(invoices.paymentStatus, "paid"))).get();
  const unpaidInvoices = unpaidResult?.count || 0;

  // KPI: active sites
  const sitesResult = await db.select({ count: count() }).from(sites)
    .where(eq(sites.status, "active")).get();
  const activeSites = sitesResult?.count || 0;

  // KPI: workers today
  const attResult = await db.select({ count: count() }).from(workerAttendance)
    .where(eq(workerAttendance.date, today)).get();
  const workersToday = attResult?.count || 0;

  // KPI: monthly pourings m3
  const pourResult = await db.select({ total: sum(pourings.quantityM3) }).from(pourings)
    .where(gte(pourings.date, monthStart)).get();
  const totalPouringsM3 = pourResult?.total || 0;

  // Upcoming calendar
  const upcomingCalendar = await db
    .select({
      date: siteCalendar.plannedDate,
      siteName: sites.name,
      concreteType: schema.concreteTypes.name,
      estimatedM3: siteCalendar.estimatedM3,
      status: siteCalendar.status,
    })
    .from(siteCalendar)
    .leftJoin(sites, eq(siteCalendar.siteId, sites.id))
    .leftJoin(schema.concreteTypes, eq(siteCalendar.concreteTypeId, schema.concreteTypes.id))
    .where(and(
      gte(siteCalendar.plannedDate, today),
      lte(siteCalendar.plannedDate, nextWeekStr),
      ne(siteCalendar.status, "done"),
    ))
    .orderBy(siteCalendar.plannedDate)
    .limit(10)
    .all();

  // Machines with expiring docs
  const allMachines = await db.select().from(machines).all();
  const expiringDocs: any[] = [];
  allMachines.forEach(m => {
    const fields = [
      { machineName: m.name, type: "vignette", expiryDate: m.vignetteExpiry },
      { machineName: m.name, type: "insurance", expiryDate: m.insuranceExpiry },
      { machineName: m.name, type: "tech", expiryDate: m.techInspectionExpiry },
    ];
    fields.forEach(f => {
      if (!f.expiryDate) return;
      const status = f.expiryDate < today ? "expired" : f.expiryDate <= thirtyDaysStr ? "expiring" : null;
      if (status) expiringDocs.push({ machineName: f.machineName, type: f.type, expiryDate: f.expiryDate, status });
    });
  });
  expiringDocs.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  // Low stock
  const lowStock = await db
    .select({
      name: materials.name,
      quantity: materials.quantity,
      unit: materials.unit,
      minThreshold: materials.minThreshold,
    })
    .from(materials)
    .where(and(
      gte(materials.minThreshold, 0.01),
      lte(materials.quantity, materials.minThreshold),
    ))
    .all();

  return NextResponse.json({
    monthlyRevenue,
    openOffers,
    unpaidInvoices,
    activeSites,
    workersToday,
    totalPouringsM3,
    upcomingCalendar,
    expiringDocs,
    lowStock,
  });
}
```

**Need to import schema for dynamic refs:** Add `import * as schema from "@/db/schema";` at top, use `schema.concreteTypes` in query.

**Verification:** `curl -s http://localhost:3000/api/dashboard/stats | jq .`

---

### Task 2: Build dashboard UI with KPI cards

**Objective:** Replace placeholder `page.tsx` with real dashboard.

**File:** Replace `src/app/(dashboard)/page.tsx`

**Implementation:**

```tsx
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
  upcomingCalendar: { date: string; siteName: string | null; concreteType: string | null; estimatedM3: number | null; status: string }[];
  expiringDocs: { machineName: string; type: string; expiryDate: string; status: string }[];
  lowStock: { name: string; quantity: number; unit: string; minThreshold: number }[];
};

const docTypeLabels: Record<string, string> = { vignette: "Винетка", insurance: "ГО", tech: "Тех. преглед" };
const docTypeIcons: Record<string, string> = { vignette: "🛣️", insurance: "🛡️", tech: "🔧" };

export default function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
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
        <KpiCard title="Оборот (месец)" value={`€${data.monthlyRevenue.toLocaleString("bg-BG")}`} icon="💰" />
        <KpiCard title="Отворени оферти" value={data.openOffers} icon="📋" />
        <KpiCard title="Неизплатени" value={data.unpaidInvoices} icon="⚠️" />
        <KpiCard title="Активни обекти" value={data.activeSites} icon="🏗️" />
        <KpiCard title="Работници днес" value={data.workersToday} icon="👷" />
        <KpiCard title="Излят бетон" value={`${data.totalPouringsM3} m³`} icon="🪣" />
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming schedule */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">📅 Предстоящи наряди (7 дни)</CardTitle></CardHeader>
          <CardContent>
            {data.upcomingCalendar.length === 0 ? (
              <p className="text-muted-foreground text-sm">Няма планирани наряди</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingCalendar.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{e.siteName || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.date} · {e.concreteType || "—"} · {e.estimatedM3 || 0} m³
                      </p>
                    </div>
                    <Badge variant={e.status === "confirmed" ? "default" : "secondary"} className="text-xs">
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
          <CardHeader className="pb-2"><CardTitle className="text-base">🚨 Изтичащи документи (30 дни)</CardTitle></CardHeader>
          <CardContent>
            {data.expiringDocs.length === 0 ? (
              <p className="text-muted-foreground text-sm">Всички документи са актуални ✅</p>
            ) : (
              <div className="space-y-2">
                {data.expiringDocs.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <span>{docTypeIcons[e.type]}</span>
                      <div>
                        <p className="font-medium">{e.machineName}</p>
                        <p className="text-xs text-muted-foreground">{docTypeLabels[e.type]} · {e.expiryDate}</p>
                      </div>
                    </div>
                    <Badge variant={e.status === "expired" ? "destructive" : "secondary"} className="text-xs">
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
        <CardHeader className="pb-2"><CardTitle className="text-base">📦 Ниски наличности</CardTitle></CardHeader>
        <CardContent>
          {data.lowStock.length === 0 ? (
            <p className="text-muted-foreground text-sm">Всички наличности са над минимума ✅</p>
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

function KpiCard({ title, value, icon }: { title: string; value: string | number; icon: string }) {
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
        {Array(6).fill(0).map((_, i) => (
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
```

**Requires:** `Badge` component from shadcn/ui. Check if installed: `npx shadcn-ui add badge` if not present.

**Verification:** Visit `http://localhost:3000/` after login, see KPI cards with real or zero data.

---

### Task 3: Ensure Badge component exists

**Check:** `src/components/ui/badge.tsx` exists. If not:
```bash
cd /root/beton-erp && npx shadcn-ui@latest add badge --yes
```

---

### Task 4: Build, test locally, commit

**Steps:**
```bash
cd /root/beton-erp
npm run build 2>&1 | tail -5
# If success:
git add -A
git commit -m "feat: real dashboard with KPI cards, upcoming schedule, expiring docs, low stock"
git push origin main
```

**Expected:** Build succeeds with no new TypeScript errors.

---

### Task 5: Deploy to production via Coolify

**Trigger:** POST to Coolify API deploy endpoint for the production app.

**Verification:** Visit `https://beton.blv.bg`, login, dashboard shows KPI cards.

---

## Risks & Notes

- **Empty data is OK** — cards show 0/празни състояния gracefully
- **Schema import** — need `import * as schema from "@/db/schema"` for dynamic table refs in the join query
- **Badge component** — check if installed, add if missing
- **No chart library** — kept simple with cards and lists to avoid adding deps
- **monthlyRevenue only counts "sent" invoices** — draft invoices excluded from revenue
