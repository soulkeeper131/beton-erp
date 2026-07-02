"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";
import { useIsAdmin } from "@/lib/use-is-admin";

export default function ConcreteTypesPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/concrete-types").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Сигурен ли си?")) return;
    await fetch(`/api/concrete-types/${id}`, { method: "DELETE" });
    setData(data.filter(ct => ct.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🧱 Типове бетон</h1>
        {isAdmin && <Button onClick={() => router.push("/concrete-types/new")}>+ Нов тип</Button>}
      </div>
      <DataList
        columns={[
          { key: "name", label: "Име" },
          { key: "pricePerM3", label: "Цена/m³", render: (v: number) => `${v} лв` },
          { key: "description", label: "Описание" },
        ]}
        data={data}
        loading={loading}
        onEdit={(id) => router.push(`/concrete-types/${id}`)}
        onDelete={handleDelete}
        isAdmin={isAdmin}
        emptyText="Няма типове бетон"
      />
    </div>
  );
}
