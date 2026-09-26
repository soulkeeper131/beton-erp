"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";
import { useIsAdmin } from "@/lib/use-is-admin";

const statusLabels: Record<string, string> = { active: "✅ Активен", inactive: "❌ Неактивен" };

export default function WorkersPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workers").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Да изтрия ли работника?")) return;
    const res = await fetch(`/api/workers/${id}`, { method: "DELETE" });
    if (!res.ok) return alert((await res.json().catch(() => null))?.error || "Грешка при изтриване");
    setData(data.filter(w => w.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">👷 Работници</h1>
        {isAdmin && <Button onClick={() => router.push("/workers/new")}>+ Нов работник</Button>}
      </div>
      <DataList
        columns={[
          { key: "name", label: "Име" },
          { key: "phone", label: "Телефон" },
          { key: "dailyRate", label: "Дневна ставка", render: (v: number) => `${v} € (${Math.round((v / 8) * 100) / 100} €/ч)` },
          { key: "status", label: "Статус", render: (v: string) => statusLabels[v] || v },
        ]}
        data={data}
        loading={loading}
        onEdit={(id) => router.push(`/workers/${id}/edit`)}
        onDelete={handleDelete}
        isAdmin={isAdmin}
        emptyText="Няма работници"
      />
    </div>
  );
}
