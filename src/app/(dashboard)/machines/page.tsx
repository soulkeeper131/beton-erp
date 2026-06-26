"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";

const typeLabels: Record<string, string> = { mixer: "🚛 Миксер", pump: "🏗️ Помпа", vibrator: "〰️ Вибратор", other: "🔧 Друго" };
const statusLabels: Record<string, string> = { available: "✅ Свободна", in_use: "🔴 Заета", maintenance: "🔧 Ремонт" };

export default function MachinesPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/machines").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Сигурен ли си?")) return;
    await fetch(`/api/machines/${id}`, { method: "DELETE" });
    setData(data.filter(m => m.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🚛 Машини</h1>
        <Button onClick={() => router.push("/machines/new")}>+ Нова машина</Button>
      </div>
      <DataList
        columns={[
          { key: "name", label: "Име" },
          { key: "type", label: "Тип", render: (v: string) => typeLabels[v] || v },
          { key: "plateNumber", label: "Номер" },
          { key: "status", label: "Статус", render: (v: string) => statusLabels[v] || v },
        ]}
        data={data}
        loading={loading}
        onDelete={handleDelete}
        emptyText="Няма машини"
      />
    </div>
  );
}
