"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataList } from "@/components/ui/data-list";

export default function PouringsPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [filterSite, setFilterSite] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sites").then(r => r.json()).then(setSites);
    fetch("/api/pourings").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  async function loadFiltered(siteId: string) {
    setFilterSite(siteId);
    setLoading(true);
    const url = siteId !== "all" ? `/api/pourings?siteId=${siteId}` : "/api/pourings";
    const res = await fetch(url);
    setData(await res.json());
    setLoading(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("Сигурен ли си?")) return;
    await fetch(`/api/pourings/${id}`, { method: "DELETE" });
    loadFiltered(filterSite);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📋 Актувания</h1>
        <Button onClick={() => router.push("/pourings/new")}>+ Ново актуване</Button>
      </div>
      <Select value={filterSite} onValueChange={loadFiltered}>
        <SelectTrigger className="w-[250px]"><SelectValue placeholder="Всички обекти" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Всички обекти</SelectItem>
          {sites.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <DataList
        columns={[
          { key: "date", label: "Дата" },
          { key: "site", label: "Обект", render: (v: any) => v?.name || "—" },
          { key: "concreteType", label: "Тип бетон", render: (v: any) => v?.name || "—" },
          { key: "quantityM3", label: "К-во", render: (v: number) => `${v} m³` },
          { key: "machine", label: "Машина", render: (v: any) => v?.name || "—" },
        ]}
        data={data}
        loading={loading}
        onEdit={(id) => router.push(`/pourings/${id}`)}
        onDelete={handleDelete}
        emptyText="Няма актувания"
      />
    </div>
  );
}
