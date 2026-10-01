"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataList } from "@/components/ui/data-list";
import { useIsAdmin } from "@/lib/use-is-admin";
import { formatCurrency } from "@/lib/utils";

// useSearchParams изисква Suspense граница
export default function PouringsPage() {
  return <Suspense><PouringsList /></Suspense>;
}

function PouringsList() {
  const router = useRouter();
  const search = useSearchParams();
  const isAdmin = useIsAdmin();
  const canInvoice = isAdmin; // фактури издава администраторът (както „+ Нова“ във Фактури)
  const [data, setData] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [filterSite, setFilterSite] = useState<string>("all");
  // ?invoiced=0 — от таблото („Нефактурирани актове“)
  const [filterBilled, setFilterBilled] = useState<string>(["0", "1"].includes(search.get("invoiced") || "") ? search.get("invoiced")! : "all");
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(siteId = filterSite, billed = filterBilled) {
    setLoading(true);
    const q = new URLSearchParams();
    if (siteId !== "all") q.set("siteId", siteId);
    if (billed !== "all") q.set("invoiced", billed);
    const res = await fetch(`/api/pourings?${q}`);
    setData(await res.json());
    setSelected([]);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/sites").then(r => r.json()).then(setSites);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Да изтрия ли акта? Изразходените материали ще се върнат в склада.")) return;
    const res = await fetch(`/api/pourings/${id}`, { method: "DELETE" });
    if (!res.ok) alert((await res.json().catch(() => null))?.error || "Грешка при изтриване");
    load();
  }

  const selectedRows = data.filter(p => selected.includes(p.id));
  const sameClient = new Set(selectedRows.map(p => p.clientId)).size <= 1;
  const toggle = (id: number) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📋 Актувания</h1>
        {isAdmin && <Button onClick={() => router.push("/pourings/new")}>+ Ново актуване</Button>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={filterSite} onValueChange={v => { setFilterSite(v); load(v, filterBilled); }}>
          <SelectTrigger className="w-[250px]"><SelectValue placeholder="Всички обекти" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всички обекти</SelectItem>
            {sites.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {canInvoice && (
          <Select value={filterBilled} onValueChange={v => { setFilterBilled(v); load(filterSite, v); }}>
            <SelectTrigger className="w-[200px]" aria-label="Фактуриране"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички актове</SelectItem>
              <SelectItem value="0">Нефактурирани</SelectItem>
              <SelectItem value="1">Фактурирани</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {canInvoice && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
          <span>Избрани {selected.length} акта · {selectedRows.reduce((s, p) => s + (p.quantityM3 || 0), 0).toFixed(2)} m³ · {formatCurrency(selectedRows.reduce((s, p) => s + (p.total || 0), 0))} без ДДС</span>
          {!sameClient && <span className="text-red-600">Актовете са на различни клиенти</span>}
          <Button size="sm" className="ml-auto" disabled={!sameClient} onClick={() => router.push(`/invoices/new?pourings=${selected.join(",")}`)}>
            🧾 Фактурирай избраните
          </Button>
        </div>
      )}

      <DataList
        columns={[
          ...(canInvoice ? [{
            key: "select", label: "",
            render: (_: any, row: any) => row.invoiceId ? null : (
              <input type="checkbox" aria-label={`Избери акт ${row.id}`} className="h-4 w-4" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} />
            ),
          }] : []),
          { key: "date", label: "Дата", render: (v: string, row: any) => <Link href={`/pourings/${row.id}`} className="text-primary hover:underline">{v}</Link> },
          { key: "site", label: "Обект", render: (v: any) => v?.name || "—" },
          { key: "quantityM3", label: "К-во (m³)", render: (v: number) => `${(v || 0).toFixed(1)} m³` },
          ...(canInvoice ? [
            { key: "total", label: "Сума", render: (v: number) => formatCurrency(v || 0) },
            { key: "invoice", label: "Фактура", render: (v: any) => v?.id
              ? <Link href={`/invoices/${v.id}`} className="hover:underline">{v.status === "draft" ? "чернова" : v.number}</Link>
              : <span className="text-orange-600">нефактуриран</span> },
          ] : []),
          { key: "machine", label: "Машина", render: (v: any) => v?.name || "—" },
        ]}
        data={data}
        loading={loading}
        onDelete={handleDelete}
        isAdmin={isAdmin}
        emptyText="Няма актувания"
      />
    </div>
  );
}
