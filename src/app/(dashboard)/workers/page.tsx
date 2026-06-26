"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";

const statusLabels: Record<string, string> = { active: "✅ Активен", inactive: "❌ Неактивен" };

export default function WorkersPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workers").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Сигурен ли си?")) return;
    await fetch(`/api/workers/${id}`, { method: "DELETE" });
    setData(data.filter(w => w.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">👷 Работници</h1>
        <Button onClick={() => router.push("/workers/new")}>+ Нов работник</Button>
      </div>
      <DataList
        columns={[
          { key: "name", label: "Име" },
          { key: "phone", label: "Телефон" },
          { key: "dailyRate", label: "Дневна ставка", render: (v: number) => `${v} лв` },
          { key: "status", label: "Статус", render: (v: string) => statusLabels[v] || v },
        ]}
        data={data}
        loading={loading}
        onDelete={handleDelete}
        emptyText="Няма работници"
      />
    </div>
  );
}
