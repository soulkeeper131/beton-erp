"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";
import { formatCurrency } from "@/lib/utils";
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
    if (!confirm("Да изтрия ли материала и историята му?")) return;
    const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
    if (!res.ok) return alert((await res.json().catch(() => null))?.error || "Грешка при изтриване");
    setData(data.filter(m => m.id !== id));
  }

  const low = data.filter(m => m.minThreshold > 0 && m.quantity <= m.minThreshold).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📦 Склад</h1>
          {data.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Стойност на склада: <b>{formatCurrency(data.reduce((s, m) => s + Math.max(0, m.quantity) * (m.pricePerUnit || 0), 0))}</b>
              {low > 0 && <span className="text-orange-600"> · {low} под минимума</span>}
            </p>
          )}
        </div>
        {isAdmin && <Button onClick={() => router.push("/materials/new")}>+ Нов материал</Button>}
      </div>
      <DataList
        rowHref={row => `/materials/${row.id}`}
        columns={[
          { key: "name", label: "Име" },
          { key: "quantity", label: "Наличност", render: (v: number, row: any) => (
            <span className={v < 0 ? "text-red-600 font-medium" : row.minThreshold > 0 && v <= row.minThreshold ? "text-orange-600 font-medium" : ""}>
              {v} {row.unit || ""}{row.minThreshold > 0 && v <= row.minThreshold ? " ⚠️" : ""}
            </span>
          ) },
          { key: "minThreshold", label: "Мин. праг", render: (v: number, row: any) => `${v} ${row.unit || ""}` },
          { key: "pricePerUnit", label: "Средна цена", render: (v: number | null, row: any) => v ? `${v} €/${row.unit || "ед."}` : "—" },
          { key: "value", label: "Стойност", render: (_: any, row: any) => row.pricePerUnit ? formatCurrency(Math.max(0, row.quantity) * row.pricePerUnit) : "—" },
        ]}
        data={data}
        loading={loading}
        onEdit={(id) => router.push(`/materials/${id}`)}
        onDelete={handleDelete}
        isAdmin={isAdmin}
        emptyText="Няма материали"
      />
    </div>
  );
}
