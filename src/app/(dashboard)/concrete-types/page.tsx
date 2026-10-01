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
    // И неактивните — за да може да се пуснат отново
    fetch("/api/concrete-types?all=1").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Типът ще спре да се предлага в нови оферти и актове (старите остават непроменени). Продължаване?")) return;
    const res = await fetch(`/api/concrete-types/${id}`, { method: "DELETE" });
    if (!res.ok) { alert((await res.json().catch(() => null))?.error || "Грешка"); return; }
    setData(data.map(ct => ct.id === id ? { ...ct, active: false } : ct));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🧱 Типове бетон</h1>
        {isAdmin && <Button onClick={() => router.push("/concrete-types/new")}>+ Нов тип</Button>}
      </div>
      <DataList
        rowHref={row => `/concrete-types/${row.id}`}
        columns={[
          { key: "name", label: "Име" },
          { key: "pricePerM3", label: "Цена/m³", render: (v: number) => `${v} €` },
          { key: "description", label: "Описание" },
          { key: "active", label: "Статус", render: (v: boolean) => v === false ? <span className="text-muted-foreground">неактивен</span> : "активен" },
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
