"use client";

import { useEffect, useState } from "react";
import { DataList } from "@/components/ui/data-list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const actionLabels: Record<string, string> = {
  CREATE: "➕ Създаване", UPDATE: "✏️ Редакция", DELETE: "🗑️ Изтриване",
  LOGIN: "🔑 Вход", LOGOUT: "🚪 Изход", EXPORT: "📥 Експорт",
};
const entityLabels: Record<string, string> = {
  clients: "👥 Клиент", sites: "🏗️ Обект", offers: "📋 Оферта",
  pourings: "🪣 Актуване", machines: "🚛 Машина", workers: "👷 Работник",
  materials: "📦 Материал", invoices: "🧾 Фактура", services: "🔧 Услуга",
  concrete_types: "🧱 Бетон", firm_settings: "⚙️ Настройки",
  users: "👤 Потребител",
};

export default function AuditLogPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [filters, setFilters] = useState<{ entityTypes: string[]; actions: string[] }>({ entityTypes: [], actions: [] });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (entityType) params.set("entityType", entityType);
    if (action) params.set("action", action);
    fetch(`/api/audit-log?${params}`)
      .then(r => r.json())
      .then(d => {
        setData(d.rows || []);
        setTotalPages(d.totalPages || 1);
        setFilters(d.filters || { entityTypes: [], actions: [] });
        setLoading(false);
      });
  }, [page, entityType, action]);

  const formatChanges = (changes: string | null) => {
    if (!changes) return "—";
    try {
      const obj = JSON.parse(changes);
      return Object.entries(obj)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(", ");
    } catch { return changes; }
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts + "Z");
    return d.toLocaleString("bg-BG", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📋 Одит лог</h1>

      <div className="flex flex-wrap gap-3">
        <Select value={entityType} onValueChange={v => { setEntityType(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Всички обекти" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Всички обекти</SelectItem>
            {filters.entityTypes.map(t => (
              <SelectItem key={t} value={t}>{entityLabels[t] || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={v => { setAction(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Всички действия" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Всички действия</SelectItem>
            {filters.actions.map(a => (
              <SelectItem key={a} value={a}>{actionLabels[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { setEntityType(""); setAction(""); setPage(1); }}>
          Изчисти
        </Button>
      </div>

      <DataList
        columns={[
          { key: "timestamp", label: "Дата/час", render: (v: string) => <span className="text-xs whitespace-nowrap">{formatDate(v)}</span> },
          { key: "user_name", label: "Потребител", render: (v: string, row: any) => v || row.user_email || "Система" },
          { key: "action", label: "Действие", render: (v: string) => actionLabels[v] || v },
          { key: "entity_type", label: "Обект", render: (v: string) => entityLabels[v] || v },
          { key: "changes", label: "Промени", render: (v: string) => <span className="text-xs text-muted-foreground max-w-[300px] truncate block">{formatChanges(v)}</span> },
        ]}
        data={data}
        loading={loading}
        emptyText="Няма записи в одит лога"
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">Стр. {page} от {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
