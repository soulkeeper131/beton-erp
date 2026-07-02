"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from "lucide-react";
import { useIsAdmin } from "@/lib/use-is-admin";

type CalendarEntry = {
  id: number;
  plannedDate: string;
  estimatedM3: number | null;
  status: string;
  notes: string | null;
  siteName: string | null;
};

const MONTHS = ["Януари","Февруари","Март","Април","Май","Юни","Юли","Август","Септември","Октомври","Ноември","Декември"];
const DAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"];

export default function CalendarPage() {
  const isAdmin = useIsAdmin();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [editEntry, setEditEntry] = useState<CalendarEntry | null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formSiteId, setFormSiteId] = useState("");
  const [formM3, setFormM3] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("planned");

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/calendar?month=${monthKey}`);
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, [monthKey]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { fetch("/api/sites").then(r => r.json()).then(setSites); }, []);

  const openNew = (date: string) => {
    setEditEntry(null);
    setSelectedDate(date);
    setFormSiteId("");
    setFormM3("");
    setFormNotes("");
    setFormStatus("planned");
    setDialogOpen(true);
  };

  const openEdit = (e: CalendarEntry) => {
    setEditEntry(e);
    setSelectedDate(e.plannedDate);
    setFormSiteId(""); // loaded from entry site relation
    setFormM3(e.estimatedM3?.toString() || "");
    setFormNotes(e.notes || "");
    setFormStatus(e.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editEntry) {
      await fetch(`/api/calendar?id=${editEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plannedDate: selectedDate, status: formStatus, notes: formNotes, estimatedM3: formM3 ? parseFloat(formM3) : null }),
      });
    } else {
      await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: parseInt(formSiteId), plannedDate: selectedDate, estimatedM3: formM3 ? parseFloat(formM3) : null, notes: formNotes }),
      });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchEntries();
  };

  const handleDelete = async () => {
    if (!editEntry) return;
    await fetch(`/api/calendar?id=${editEntry.id}`, { method: "DELETE" });
    setDialogOpen(false);
    fetchEntries();
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

  const todayStr = today.toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📅 Календар</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold min-w-[120px] text-center">{MONTHS[month]} {year}</span>
          <Button variant="outline" size="icon" onClick={() => month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <Card>
          <CardContent className="p-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground py-2 border-b">
              {DAYS.map(d => <div key={d}>{d}</div>)}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                const dayEntries = day ? getEntriesForDay(day) : [];
                const isToday = dateStr === todayStr;

                return (
                  <div
                    key={i}
                    className={`min-h-[80px] border border-border/50 p-1 text-xs ${
                      day ? "cursor-pointer hover:bg-muted/50" : "bg-muted/20"
                    } ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                    onClick={() => day && isAdmin && openNew(dateStr)}
                  >
                    {day && (
                      <>
                        <div className={`font-medium mb-0.5 ${isToday ? "text-primary" : ""}`}>{day}</div>
                        {dayEntries.map(e => (
                          <div
                            key={e.id}
                            className={`px-1 py-0.5 rounded mb-0.5 cursor-pointer truncate ${
                              e.status === "confirmed" ? "bg-green-100 text-green-800" :
                              e.status === "done" ? "bg-blue-100 text-blue-800" :
                              "bg-orange-100 text-orange-800"
                            }`}
                            onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                          >
                            {e.siteName || "Без обект"}
                            {e.estimatedM3 ? ` (${e.estimatedM3}m³)` : ""}
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

      {/* Dialog for create/edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editEntry ? "Редактирай" : "Нов запис"} — {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {!editEntry && (
              <div>
                <Label>Обект</Label>
                <Select value={formSiteId} onValueChange={setFormSiteId}>
                  <SelectTrigger><SelectValue placeholder="Избери обект..." /></SelectTrigger>
                  <SelectContent>
                    {sites.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editEntry && (
              <div>
                <Label>Статус</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Планиран</SelectItem>
                    <SelectItem value="confirmed">Потвърден</SelectItem>
                    <SelectItem value="done">Изпълнен</SelectItem>
                    <SelectItem value="postponed">Отложен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Очаквано количество (m³)</Label>
              <Input type="number" value={formM3} onChange={e => setFormM3(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Бележки</Label>
              <Input value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <div>
              {editEntry && isAdmin && (
                <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="h-4 w-4" /></Button>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving || (!editEntry && !formSiteId)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Запази
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
