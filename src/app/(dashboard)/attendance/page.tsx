"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsAdmin } from "@/lib/use-is-admin";
import { formatCurrency } from "@/lib/utils";
import { payrollSummary } from "@/lib/payroll";
import { toCsv } from "@/lib/reports";
import { today } from "@/lib/dates";

const NONE = "none"; // „без обект“ в падащите списъци

export default function AttendancePage() {
  const isAdmin = useIsAdmin();
  const [workers, setWorkers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [month, setMonth] = useState(today().substring(0, 7));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // форма — няколко работника наведнъж (екип за деня)
  const [selected, setSelected] = useState<number[]>([]);
  const [date, setDate] = useState(today());
  const [siteId, setSiteId] = useState(NONE);
  const [hours, setHours] = useState("8");
  const [overtime, setOvertime] = useState("0");
  const [advance, setAdvance] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/attendance?month=${month}`);
    const d = await res.json();
    setEntries(Array.isArray(d) ? d : []);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    fetch("/api/workers").then((r) => r.json()).then((d) => setWorkers(Array.isArray(d) ? d : []));
    fetch("/api/sites").then((r) => r.json()).then((d) => setSites(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = workers.filter((w) => w.status !== "inactive");
  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function handleAdd() {
    setError(""); setInfo("");
    if (!selected.length) return setError("Изберете поне един работник");
    setSaving(true);
    const failed: string[] = [];
    let ok = 0;
    for (const workerId of selected) {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId, date,
          siteId: siteId === NONE ? null : parseInt(siteId),
          hours: parseFloat(hours) || 0,
          overtime: parseFloat(overtime) || 0,
          // Авансът е личен — само при един избран работник
          advance: selected.length === 1 && advance ? parseFloat(advance) : 0,
          notes: notes || null,
        }),
      });
      if (res.ok) ok++;
      else {
        const name = workers.find((w) => w.id === workerId)?.name || `#${workerId}`;
        failed.push(`${name}: ${(await res.json().catch(() => null))?.error || "грешка"}`);
      }
    }
    setSaving(false);
    if (failed.length) setError(failed.join("\n"));
    if (ok) {
      setInfo(`Записани ${ok} ${ok === 1 ? "явка" : "явки"}`);
      setSelected([]); setAdvance(""); setNotes("");
      load();
    }
  }

  async function fromActs() {
    setError(""); setInfo("");
    if (!confirm(`Да създам явки от работниците в актовете за ${month}? Съществуващите явки не се променят.`)) return;
    const res = await fetch("/api/attendance/from-acts", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok) return setError(d?.error || "Грешка");
    setInfo(`От актовете: създадени ${d.created}, пропуснати ${d.skipped} (вече има явка)`);
    load();
  }

  async function saveEdit() {
    if (!edit) return;
    const res = await fetch(`/api/attendance/${edit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: edit.date,
        siteId: edit.siteId === NONE ? null : parseInt(edit.siteId),
        hours: parseFloat(edit.hours) || 0,
        overtime: parseFloat(edit.overtime) || 0,
        advance: parseFloat(edit.advance) || 0,
        notes: edit.notes || null,
      }),
    });
    if (!res.ok) return alert((await res.json().catch(() => null))?.error || "Грешка");
    setEdit(null);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Да изтрия ли явката?")) return;
    const res = await fetch(`/api/attendance/${id}`, { method: "DELETE" });
    if (!res.ok) return alert((await res.json().catch(() => null))?.error || "Грешка при изтриване");
    load();
  }

  // Ведомост — всяка явка със своите ставки (смяна на ставката не променя минали месеци)
  const summary = payrollSummary(entries);
  const totals = summary.reduce((t, s) => ({ gross: t.gross + s.gross, advance: t.advance + s.advance, net: t.net + s.net }), { gross: 0, advance: 0, net: 0 });

  function exportCsv() {
    const csv = toCsv(
      ["Работник", "Дни", "Часа", "Основна", "Извънредни ч", "Извънредни", "Брутно", "Аванс", "За плащане"],
      summary.map((s) => [s.name, Math.round(s.days * 10) / 10, s.hours, s.base, s.overtime, s.overtimePay, s.gross, s.advance, s.net]),
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `vedomost_${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">👷 Явки и заплати</h1>

      {isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Добави явка</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Работници * (изберете един или целия екип)</Label>
              <div className="flex flex-wrap gap-2 mt-1" data-testid="worker-picker">
                {active.length === 0 && <span className="text-sm text-muted-foreground">Няма активни работници</span>}
                {active.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggle(w.id)}
                    className={`px-3 py-1 rounded-full border text-sm ${selected.includes(w.id) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                    aria-pressed={selected.includes(w.id)}
                  >
                    {w.name}
                  </button>
                ))}
                {active.length > 1 && (
                  <button type="button" className="px-3 py-1 text-sm underline text-muted-foreground"
                    onClick={() => setSelected(selected.length === active.length ? [] : active.map((w) => w.id))}>
                    {selected.length === active.length ? "Никой" : "Всички"}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Дата *</Label>
                <Input type="date" className="h-9" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Обект</Label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Без обект</SelectItem>
                    {sites.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Часа</Label>
                <Input type="number" step="0.5" min="0" max="24" className="h-9" value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Извънредни (ч)</Label>
                <Input type="number" step="0.5" min="0" className="h-9" value={overtime} onChange={(e) => setOvertime(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Аванс (€){selected.length > 1 ? " — само за един" : ""}</Label>
                <Input type="number" step="0.01" min="0" className="h-9" value={advance} onChange={(e) => setAdvance(e.target.value)} disabled={selected.length > 1} />
              </div>
              <div className="col-span-2 md:col-span-3">
                <Label className="text-xs">Забележка</Label>
                <Input className="h-9" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            {error && <div className="whitespace-pre-line rounded-md border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-700 dark:text-red-400" role="alert">{error}</div>}
            {info && <div className="rounded-md border border-green-600/40 bg-green-600/10 p-2 text-sm" role="status">{info}</div>}
            <Button onClick={handleAdd} disabled={saving}>{saving ? "Запис..." : selected.length > 1 ? `Запиши за ${selected.length} работника` : "Запиши"}</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Ведомост</CardTitle>
          <div className="flex flex-wrap gap-2">
            {isAdmin && <Button variant="outline" size="sm" onClick={fromActs}>📋 Попълни от актовете</Button>}
            {summary.length > 0 && <Button variant="outline" size="sm" onClick={exportCsv}>⬇️ CSV</Button>}
            <Input type="month" className="w-44 h-9" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Месец" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {summary.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Няма явки за този месец</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Работник</TableHead>
                    <TableHead className="text-right">Дни / часа</TableHead>
                    <TableHead className="text-right">Основна</TableHead>
                    <TableHead className="text-right">Извънредни</TableHead>
                    <TableHead className="text-right">Аванс</TableHead>
                    <TableHead className="text-right">За плащане</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((s) => (
                    <TableRow key={s.workerId}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">{Math.round(s.days * 10) / 10} / {s.hours}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.base)}</TableCell>
                      <TableCell className="text-right">{s.overtime ? `${s.overtime} ч · ${formatCurrency(s.overtimePay)}` : "—"}</TableCell>
                      <TableCell className="text-right">{s.advance ? `-${formatCurrency(s.advance)}` : "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(s.net)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold" data-testid="payroll-total">
                    <TableCell>Общо</TableCell>
                    <TableCell />
                    <TableCell className="text-right" colSpan={2}>{formatCurrency(totals.gross)} брутно</TableCell>
                    <TableCell className="text-right">{totals.advance ? `-${formatCurrency(totals.advance)}` : "—"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.net)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Явки</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Зареждане...</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Няма записи</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Работник</TableHead>
                    <TableHead>Обект</TableHead>
                    <TableHead className="text-right">Часа</TableHead>
                    <TableHead className="text-right">Извънр.</TableHead>
                    <TableHead className="text-right">Аванс</TableHead>
                    <TableHead className="text-right">Ставка</TableHead>
                    <TableHead>Забележка</TableHead>
                    {isAdmin && <TableHead className="w-[90px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">{e.date}</TableCell>
                      <TableCell>{e.workerName || `#${e.workerId}`}</TableCell>
                      <TableCell>{e.siteName || "—"}</TableCell>
                      <TableCell className="text-right">{e.hours}</TableCell>
                      <TableCell className="text-right">{e.overtime || 0}</TableCell>
                      <TableCell className="text-right">{e.advance ? `${e.advance} €` : "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{e.dailyRate} €/ден</TableCell>
                      <TableCell>{e.notes || "—"}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" aria-label="Редактирай" onClick={() => setEdit({
                              id: e.id, workerName: e.workerName, date: e.date, siteId: e.siteId ? String(e.siteId) : NONE,
                              hours: String(e.hours ?? ""), overtime: String(e.overtime ?? 0), advance: String(e.advance ?? 0), notes: e.notes || "",
                            })}>✏️</Button>
                            <Button variant="destructive" size="sm" aria-label="Изтрий" onClick={() => handleDelete(e.id)}>🗑️</Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Явка — {edit?.workerName}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div><Label className="text-xs">Дата</Label><Input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Обект</Label>
                <Select value={edit.siteId} onValueChange={(v) => setEdit({ ...edit, siteId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Без обект</SelectItem>
                    {sites.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Часа</Label><Input type="number" step="0.5" min="0" value={edit.hours} onChange={(e) => setEdit({ ...edit, hours: e.target.value })} /></div>
              <div><Label className="text-xs">Извънредни (ч)</Label><Input type="number" step="0.5" min="0" value={edit.overtime} onChange={(e) => setEdit({ ...edit, overtime: e.target.value })} /></div>
              <div><Label className="text-xs">Аванс (€)</Label><Input type="number" step="0.01" min="0" value={edit.advance} onChange={(e) => setEdit({ ...edit, advance: e.target.value })} /></div>
              <div><Label className="text-xs">Забележка</Label><Input value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={saveEdit}>Запази</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
