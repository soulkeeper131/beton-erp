"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";

const statusLabels: Record<string, string> = { draft: "📝 Чернова", sent: "📤 Изпратена", accepted: "✅ Приета", rejected: "❌ Отказана" };

export default function OffersPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/offers").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Сигурен ли си?")) return;
    await fetch(`/api/offers/${id}`, { method: "DELETE" });
    setData(data.filter(o => o.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📋 Оферти</h1>
        <Button onClick={() => router.push("/offers/new")}>+ Нова оферта</Button>
      </div>
      <DataList
        columns={[
          { key: "number", label: "Номер" },
          { key: "client", label: "Клиент", render: (v: any) => v?.name || "—" },
          { key: "date", label: "Дата" },
          { key: "total", label: "Сума", render: (v: number) => `${v.toFixed(2)} лв` },
          { key: "status", label: "Статус", render: (v: string) => statusLabels[v] || v },
        ]}
        data={data}
        loading={loading}
        onEdit={(id) => router.push(`/offers/${id}`)}
        onDelete={handleDelete}
        emptyText="Няма оферти"
      />
    </div>
  );
}
