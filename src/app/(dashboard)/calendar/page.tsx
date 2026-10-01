"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { today as sofiaToday } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { useIsAdmin } from "@/lib/use-is-admin";

type CalendarEntry = {
  id: number;
  plannedDate: string;
  estimatedM3: number | null;
  status: string;
  notes: string | null;
  siteId: number;
  concreteTypeId: number | null;
  machineId: number | null;
  siteName: string | null;
  concreteTypeName: string | null;
  machineName: string | null;
};

const MONTHS = ["Януари","Февруари","Март","Април","Май","Юни","Юли","Август","Септември","Октомври","Ноември","Декември"];
const DAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"];
const STATUS_STYLE: Record<string, string> = {
  planned: "bg-orange-100 text-orange-800",
  confirmed: "bg-green-100 text-green-800",
  done: "bg-blue-100 text-blue-800",
  postponed: "bg-gray-200 text-gray-600 line-through",
};
const NONE = "none"; // „без“ в падащите списъци

const emptyForm = { siteId: "", date: "", concreteTypeId: NONE, machineId: NONE, m3: "", notes: "", status: "planned" };

export default function CalendarPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<CalendarEntry | null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [concreteTypes, setConcreteTypes] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/calendar?month=${monthKey}`);
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, [monthKey]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => {
    fetch("/api/sites").then(r => r.json()).then(d => Array.isArray(d) && setSites(d));
    fetch("/api/concrete-types").then(r => r.json()).then(d => Array.isArray(d) && setConcreteTypes(d));
    // Бригадирът няма достъп до машините — тогава списъкът е празен
    fetch("/api/machines").then(r => (r.ok ? r.json() : [])).then(d => Array.isArray(d) && setMachines(d)).catch(() => {});
  }, []);

  const openNew = (date: string) => {
    setEditEntry(null);
    setError("");
    setForm({ ...emptyForm, date });
    setDialogOpen(true);
  };

  const openEdit = (e: CalendarEntry) => {
    setEditEntry(e);
    setError("");
    setForm({
      siteId: String(e.siteId),
      date: e.plannedDate,
      concreteTypeId: e.concreteTypeId ? String(e.concreteTypeId) : NONE,
      machineId: e.machineId ? String(e.machineId) : NONE,
      m3: e.estimatedM3?.toString() || "",
      notes: e.notes || "",
      status: e.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError("");
    if (!form.siteId) return setError("Изберете обект");
    if (!form.date) return setError("Изберете дата");
    setSaving(true);
    const body = {
      siteId: parseInt(form.siteId),
      plannedDate: form.date,
      concreteTypeId: form.concreteTypeId === NONE ? null : parseInt(form.concreteTypeId),
      machineId: form.machineId === NONE ? null : parseInt(form.machineId),
      estimatedM3: form.m3 ? parseFloat(form.m3) : null,
      notes: form.notes,
      status: form.status,
    };
    const res = await fetch(editEntry ? `/api/calendar?id=${editEntry.id}` : "/api/calendar", {
      method: editEntry ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) return setError(data?.error || "Грешка при запис");
    // Записът е направен; предупреждението (напр. машина на два обекта) се показва след това
    if (data?.warnings?.length) alert("⚠️ " + data.warnings.join("\n"));
    setDialogOpen(false);
    fetchEntries();
  };

  const handleDelete = async () => {
    if (!editEntry || !confirm("Да изтрия ли записа от календара?")) return;
    const res = await fetch(`/api/calendar?id=${editEntry.id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json().catch(() => null))?.error || "Грешка при изтриване");
    setDialogOpen(false);
    fetchEntries();
  };

  // Акт от планираното наливане: обект, дата и бетон се попълват; записът става „Изпълнен“
  const createAct = () => {
    if (!editEntry) return;
    const q = new URLSearchParams({ siteId: String(editEntry.siteId), date: editEntry.plannedDate, calendarId: String(editEntry.id) });
    if (editEntry.concreteTypeId) q.set("concreteTypeId", String(editEntry.concreteTypeId));
    if (editEntry.machineId) q.set("machineId", String(editEntry.machineId));
    router.push(`/pourings/new?${q}`);
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = lastDay.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getEntriesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return entries.filter(e => e.plannedDate === dateStr);
  };

  const todayStr = sofiaToday();
  // Машина, планирана на повече от един обект в същия ден
  const machineClash = (e: CalendarEntry) => !!e.machineId && e.status !== "done" && e.status !== "postponed"
    && entries.some(o => o.id !== e.id && o.machineId === e.machineId && o.plannedDate === e.plannedDate && o.status !== "done" && o.status !== "postponed");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📅 Календар</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Предишен месец" onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold min-w-[120px] text-center">{MONTHS[month]} {year}</span>
          <Button variant="outline" size="icon" aria-label="Следващ месец" onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {[["planned", "Планиран"], ["confirmed", "Потвърден"], ["done", "Изпълнен"], ["postponed", "Отложен"]].map(([k, l]) => (
          <span key={k} className={`px-2 py-0.5 rounded ${STATUS_STYLE[k]}`}>{l}</span>
        ))}
        {isAdmin && <span className="text-muted-foreground">· щракнете върху ден за нов запис</span>}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <Card>
          <CardContent className="p-2">
            <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground py-2 border-b">
              {DAYS.map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                const dayEntries = day ? getEntriesForDay(day) : [];
                const isToday = dateStr === todayStr;
                return (
                  <div
                    key={i}
                    className={`min-h-[80px] border border-border/50 p-1 text-xs ${
                      day ? (isAdmin ? "cursor-pointer hover:bg-muted/50" : "") : "bg-muted/20"
                    } ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                    onClick={() => day && isAdmin && openNew(dateStr)}
                    data-date={dateStr || undefined}
                  >
                    {day && (
                      <>
                        <div className={`font-medium mb-0.5 ${isToday ? "text-primary" : ""}`}>{day}</div>
                        {dayEntries.map(e => (
                          <div
                            key={e.id}
                            className={`px-1 py-0.5 rounded mb-0.5 cursor-pointer truncate ${STATUS_STYLE[e.status] || STATUS_STYLE.planned} ${machineClash(e) ? "ring-1 ring-red-500" : ""}`}
                            title={[e.siteName, e.concreteTypeName, e.estimatedM3 ? `${e.estimatedM3} m³` : null, e.machineName, machineClash(e) ? "⚠️ машината е и на друг обект" : null].filter(Boolean).join(" · ")}
                            onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                          >
                            {machineClash(e) && "⚠️ "}
                            {e.siteName || "Без обект"}
                            {e.estimatedM3 ? ` (${e.estimatedM3}m³)` : ""}
                            {e.machineName && <span className="hidden md:inline"> · {e.machineName}</span>}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editEntry ? "Планирано наливане" : "Ново наливане"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Обект *</Label>
                <Select value={form.siteId} onValueChange={v => setForm(f => ({ ...f, siteId: v }))} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue placeholder="Избери обект..." /></SelectTrigger>
                  <SelectContent>
                    {sites.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Дата *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} disabled={!isAdmin} />
              </div>
              <div>
                <Label>Статус</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Планиран</SelectItem>
                    <SelectItem value="confirmed">Потвърден</SelectItem>
                    <SelectItem value="done">Изпълнен</SelectItem>
                    <SelectItem value="postponed">Отложен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Бетон</Label>
                <Select value={form.concreteTypeId} onValueChange={v => setForm(f => ({ ...f, concreteTypeId: v }))} disabled={!isAdmin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {concreteTypes.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Количество (m³)</Label>
                <Input type="number" min="0" step="0.5" value={form.m3} onChange={e => setForm(f => ({ ...f, m3: e.target.value }))} placeholder="0" disabled={!isAdmin} />
              </div>
              {machines.length > 0 && (
                <div className="col-span-2">
                  <Label>Машина (помпа/миксер)</Label>
                  <Select value={form.machineId} onValueChange={v => setForm(f => ({ ...f, machineId: v }))} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {machines.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-2">
                <Label>Бележки</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            {error && <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-700 dark:text-red-400" role="alert">{error}</div>}
          </div>
          <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
            <div className="flex gap-2">
              {editEntry && isAdmin && (
                <Button variant="destructive" size="sm" onClick={handleDelete} aria-label="Изтрий"><Trash2 className="h-4 w-4" /></Button>
              )}
              {editEntry && isAdmin && editEntry.status !== "done" && (
                <Button variant="outline" size="sm" onClick={createAct}>📋 Създай акт</Button>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Запази
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
