"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";

const catLabels: Record<string, string> = { concrete: "🧱 Бетон", grinding: "✨ Шлайфане", finishing: "🎨 Довършителни", waterproofing: "💧 Хидроизолация", other: "🔧 Друго" };

export default function ServicesPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/services").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Сигурен ли си?")) return;
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    setData(data.filter(s => s.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔧 Услуги</h1>
        <Button onClick={() => router.push("/services/new")}>+ Нова услуга</Button>
      </div>
      <DataList
        columns={[
          { key: "name", label: "Име" },
          { key: "category", label: "Категория", render: (v: string) => catLabels[v] || v },
          { key: "unit", label: "М.Е." },
          { key: "basePrice", label: "Цена", render: (v: number) => v ? `${v} лв` : "—" },
        ]}
        data={data}
        loading={loading}
        onEdit={(id) => router.push(`/services/${id}/edit`)}
        onDelete={handleDelete}
        emptyText="Няма услуги"
      />
    </div>
  );
}
