"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";

const statusLabels: Record<string, string> = { draft: "📝 Чернова", sent: "📤 Изпратена", paid: "✅ Платена", overdue: "🔴 Просрочена" };

export default function InvoicesPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/invoices").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🧾 Фактури</h1>
        <Button onClick={() => router.push("/invoices/new")}>+ Нова фактура</Button>
      </div>
      <DataList
        columns={[
          { key: "number", label: "Номер" },
          { key: "client", label: "Клиент", render: (v: any) => v?.name || "—" },
          { key: "date", label: "Дата" },
          { key: "total", label: "Сума", render: (v: number, row: any) => `${(v + (row.vatAmount || 0)).toFixed(2)} лв` },
          { key: "status", label: "Статус", render: (v: string) => statusLabels[v] || v },
        ]}
        data={data}
        loading={loading}
        emptyText="Няма фактури"
      />
    </div>
  );
}
