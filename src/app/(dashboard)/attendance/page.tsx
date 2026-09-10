"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsAdmin } from "@/lib/use-is-admin";
import { formatCurrency } from "@/lib/utils";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function AttendancePage() {
  const isAdmin = useIsAdmin();
  const [workers, setWorkers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [month, setMonth] = useState(todayStr().substring(0, 7));
  const [loading, setLoading] = useState(true);

  // form
  const [workerId, setWorkerId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [siteId, setSiteId] = useState("");
  const [hours, setHours] = useState("8");
  const [overtime, setOvertime] = useState("0");
  const [advance, setAdvance] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!workerId) return alert("Избери работник");
    setSaving(true);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: parseInt(workerId),
        date,
        siteId: siteId ? parseInt(siteId) : null,
        hours: parseFloat(hours) || 0,
        overtime: parseFloat(overtime) || 0,
        advance: advance ? parseFloat(advance) : 0,
        notes: notes || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert(err.error || "Грешка");
    }
    setWorkerId("");
    setSiteId("");
    setHours("8");
    setOvertime("0");
    setAdvance("");
    setNotes("");
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Сигурен ли си?")) return;
    await fetch(`/api/attendance/${id}`, { method: "DELETE" });
    load();
  }

  // Monthly summary per worker
  const summary: Record<number, any> = {};
  for (const e of entries) {
    if (!summary[e.workerId]) {
      summary[e.workerId] = { name: e.workerName || "?", hours: 0, overtime: 0, advance: 0, rate: e.dailyRate || 0, otRate: e.overtimeRate || 0 };
    }
    summary[e.workerId].hours += e.hours || 0;
    summary[e.workerId].overtime += e.overtime || 0;
    summary[e.workerId].advance += e.advance || 0;
  }
  const summaryList = Object.values(summary);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">👷 Явки и заплати</h1>

      {/* Add form */}
      {isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Добави явка</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Работник *</Label>
                <Select value={workerId} onValueChange={setWorkerId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Избери" /></SelectTrigger>
                  <SelectContent>
                    {workers.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Дата *</Label>
                <Input type="date" className="h-9" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Обект</Label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Без обект" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Без обект</SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Часа</Label>
                <Input type="number" step="0.5" min="0" className="h-9" value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Извънредни (ч)</Label>
                <Input type="number" step="0.5" min="0" className="h-9" value={overtime} onChange={(e) => setOvertime(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Аванс (€)</Label>
                <Input type="number" step="0.01" min="0" className="h-9" value={advance} onChange={(e) => setAdvance(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Забележка</Label>
                <Input className="h-9" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <Button className="mt-3" onClick={handleAdd} disabled={saving}>{saving ? "Запис..." : "Запиши"}</Button>
          </CardContent>
        </Card>
      )}

      {/* Month filter + summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Месечна справка</CardTitle>
          <Input type="month" className="w-44 h-9" value={month} onChange={(e) => setMonth(e.target.value)} />
        </CardHeader>
        <CardContent className="p-0">
          {summaryList.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Няма явки за този месец</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Работник</TableHead>
                    <TableHead className="text-right">Часа</TableHead>
                    <TableHead className="text-right">Извънредни</TableHead>
                    <TableHead className="text-right">Аванс</TableHead>
                    <TableHead className="text-right">Очаквана заплата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryList.map((s: any, i: number) => {
                    const base = s.hours * s.rate;
                    const ot = s.overtime * (s.otRate || s.rate * 1.5);
                    const total = base + ot - s.advance;
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{s.hours}</TableCell>
                        <TableCell className="text-right">{s.overtime}</TableCell>
                        <TableCell className="text-right">{s.advance ? `${s.advance} €` : "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entries */}
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
                    <TableHead>Забележка</TableHead>
                    {isAdmin && <TableHead className="w-[50px]"></TableHead>}
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
                      <TableCell>{e.notes || "—"}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(e.id)}>🗑️</Button>
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
    </div>
  );
}
