"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataList } from "@/components/ui/data-list";
import { Search } from "lucide-react";
import { useIsAdmin } from "@/lib/use-is-admin";

export default function SitesPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/sites").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const filtered = data.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase()) ||
    s.address?.toLowerCase().includes(search.toLowerCase()) ||
    s.client?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏗️ Обекти</h1>
        {isAdmin && <Button onClick={() => router.push("/sites/new")}>+ Нов обект</Button>}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Търсене..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <DataList
        columns={[
          { key: "name", label: "Име" },
          { key: "city", label: "Град/Село" },
          { key: "address", label: "Адрес" },
          { key: "client", label: "Клиент", render: (v: any) => v?.name || "—" },
          { key: "status", label: "Статус" },
        ]}
        data={filtered}
        loading={loading}
        onEdit={(id) => router.push(`/sites/${id}`)}
        isAdmin={isAdmin}
        emptyText={search ? "Няма намерени обекти" : "Няма обекти"}
      />
    </div>
  );
}
