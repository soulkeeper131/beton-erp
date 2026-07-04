"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataList } from "@/components/ui/data-list";
import { Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useIsAdmin } from "@/lib/use-is-admin";

type Tab = "all" | "outgoing" | "incoming";

export default function InvoicesPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    fetch("/api/invoices").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const filtered = data.filter(i => {
    if (tab !== "all" && i.direction !== tab) return false;
    if (!search) return true;
    return (
      i.number?.toLowerCase().includes(search.toLowerCase()) ||
      i.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      i.clientCompany?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const directionLabels: Record<string, string> = { incoming: "📥 Вх.", outgoing: "📤 Изх." };
  const paymentLabels: Record<string, string> = { unpaid: "❌", partial: "⚠️", paid: "✅" };
  const tabOptions: { key: Tab; label: string }[] = [
    { key: "all", label: "Всички" },
    { key: "outgoing", label: "📤 Изходящи" },
    { key: "incoming", label: "📥 Входящи" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🧾 Фактури</h1>
        <div className="flex gap-2">
          {isAdmin && <Button variant="outline" size="sm" onClick={() => router.push("/invoices/drafts")}>📥 Чернови</Button>}
          {isAdmin && <Button size="sm" onClick={() => router.push("/invoices/new")}>+ Нова</Button>}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {tabOptions.map(t => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? "default" : "outline"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Търсене..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <DataList
        columns={[
          { key: "number", label: "Номер" },
          { key: "direction", label: "Тип", render: (v: string) => directionLabels[v] || v },
          { key: "client", label: tab === "incoming" ? "Доставчик" : "Клиент", render: (v: any) => v?.companyName || v?.name || "—" },
          { key: "date", label: "Дата", render: (v: string) => formatDate(v) },
          { key: "type", label: "Вид", render: (v: string) => ({invoice:"Ф-ра",proforma:"Проф.",credit_note:"Кред.изв.",debit_note:"Деб.изв."} as any)[v] || v },
          { key: "total", label: "Сума", render: (v: number, row: any) => `${formatCurrency(v)} ${row.currency || "EUR"}` },
          { key: "paymentStatus", label: "Плат.", render: (v: string) => paymentLabels[v] || v },
        ]}
        data={filtered}
        loading={loading}
        onEdit={(id) => router.push(`/invoices/${id}`)}
        isAdmin={isAdmin}
        emptyText={search ? "Няма намерени" : "Няма фактури"}
      />
    </div>
  );
}
