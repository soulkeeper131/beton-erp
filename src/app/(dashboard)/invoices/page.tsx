"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataList } from "@/components/ui/data-list";
import { Search, ArrowDown, ArrowUp } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function InvoicesPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/invoices").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const filtered = data.filter(i =>
    !search ||
    i.number?.toLowerCase().includes(search.toLowerCase()) ||
    i.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    i.clientCompany?.toLowerCase().includes(search.toLowerCase())
  );

  const directionLabels: Record<string, string> = { incoming: "📥 Вх.", outgoing: "📤 Изх." };
  const paymentLabels: Record<string, string> = { unpaid: "❌", partial: "⚠️", paid: "✅" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🧾 Фактури</h1>
        <Button onClick={() => router.push("/invoices/new")}>+ Нова фактура</Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Търсене..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <DataList
        columns={[
          { key: "number", label: "Номер" },
          { key: "direction", label: "Тип", render: (v: string) => directionLabels[v] || v },
          { key: "client", label: "Клиент", render: (v: any) => v?.companyName || v?.name || "—" },
          { key: "date", label: "Дата", render: (v: string) => formatDate(v) },
          { key: "type", label: "Вид", render: (v: string) => ({invoice:"Ф-ра",proforma:"Проф.",credit_note:"Кред.изв.",debit_note:"Деб.изв."} as any)[v] || v },
          { key: "total", label: "Сума", render: (v: number, row: any) => `${formatCurrency(v)} ${row.currency || "EUR"}` },
          { key: "paymentStatus", label: "Плат.", render: (v: string) => paymentLabels[v] || v },
        ]}
        data={filtered}
        loading={loading}
        onEdit={(id) => router.push(`/invoices/${id}`)}
        emptyText={search ? "Няма намерени" : "Няма фактури"}
      />
    </div>
  );
}
