"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";
import { useIsAdmin } from "@/lib/use-is-admin";

export default function MaterialsPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/materials").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Сигурен ли си?")) return;
    await fetch(`/api/materials/${id}`, { method: "DELETE" });
    setData(data.filter(m => m.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📦 Склад</h1>
        {isAdmin && <Button onClick={() => router.push("/materials/new")}>+ Нов материал</Button>}
      </div>
      <DataList
        columns={[
          { key: "name", label: "Име" },
          { key: "quantity", label: "Наличност", render: (v: number, row: any) => `${v} ${row.unit || ""}` },
          { key: "minThreshold", label: "Мин. праг", render: (v: number, row: any) => `${v} ${row.unit || ""}` },
          { key: "pricePerUnit", label: "Цена", render: (v: number | null) => v ? `${v} лв` : "—" },
        ]}
        data={data}
        loading={loading}
        onDelete={handleDelete}
        isAdmin={isAdmin}
        emptyText="Няма материали"
      />
    </div>
  );
}
