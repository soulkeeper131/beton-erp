"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useIsAdmin } from "@/lib/use-is-admin";
import { formatCurrency } from "@/lib/utils";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function nextMonthStr() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

type Item = { description: string; unit: string; quantity: number; price: number; vatRate: number };

export default function RecurringPage() {
  const isAdmin = useIsAdmin();
  const [list, setList] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [nextDate, setNextDate] = useState(nextMonthStr());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([{ description: "", unit: "бр.", quantity: 1, price: 0, vatRate: 20 }]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/recurring");
    const d = await res.json();
    setList(Array.isArray(d) ? d : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/clients").then((r) => r.json()).then((d) => setClients(Array.isArray(d) ? d : []));
  }, [load]);

  function setItem(idx: number, field: keyof Item, value: any) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", unit: "бр.", quantity: 1, price: 0, vatRate: 20 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleAdd() {
    if (!clientId) return alert("Избери клиент");
    if (!name.trim()) return alert("Въведи име");
    if (items.some((i) => !i.description.trim())) return alert("Въведи описание на всички редове");
    setSaving(true);
    const res = await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: parseInt(clientId),
        name: name.trim(),
        frequency,
        dayOfMonth: parseInt(dayOfMonth) || 1,
        nextDate,
        direction: "outgoing",
        items: items.map((i) => ({ ...i, quantity: Number(i.quantity) || 1, price: Number(i.price) || 0, vatRate: Number(i.vatRate) || 0 })),
        notes: notes || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert(err.error ? JSON.stringify(err.error) : "Грешка");
    }
    setClientId("");
    setName("");
    setNotes("");
    setItems([{ description: "", unit: "бр.", quantity: 1, price: 0, vatRate: 20 }]);
    load();
  }

  async function handleToggle(id: number, active: boolean) {
    await fetch(`/api/recurring/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Сигурен ли си?")) return;
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    load();
  }

  async function handleGenerate() {
    setGenerating(true);
    const res = await fetch("/api/recurring/generate", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setGenerating(false);
    if (d.count > 0) {
      alert(`Генерирани ${d.count} фактури:\n${d.generated.map((g: any) => `${g.name} → ${g.invoiceNumber}`).join("\n")}`);
    } else {
      alert("Няма периодични с настъпила дата");
    }
    load();
  }

  const totalMonthly = list.reduce((s: number, r: any) => {
    if (!r.active) return s;
    const items = r.items || [];
    return s + items.reduce((x: number, i: any) => x + (i.quantity || 0) * (i.price || 0), 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔁 Периодични фактури</h1>
        {isAdmin && (
          <Button onClick={handleGenerate} disabled={generating} variant="outline">
            {generating ? "Генериране..." : "⚡ Генерирай сега"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Активни периодични</CardTitle>
          <span className="text-sm text-muted-foreground">Месечно ≈ {formatCurrency(totalMonthly)}</span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Зареждане...</div>
          ) : list.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Няма периодични фактури</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Име</TableHead>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Период</TableHead>
                    <TableHead>Следваща</TableHead>
                    <TableHead className="text-right">Сума (без ДДС)</TableHead>
                    <TableHead>Статус</TableHead>
                    {isAdmin && <TableHead className="w-[90px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => {
                    const subtotal = (r.items || []).reduce((s: number, i: any) => s + (i.quantity || 0) * (i.price || 0), 0);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.clientCompany || r.clientName || `#${r.clientId}`}</TableCell>
                        <TableCell>{r.frequency === "monthly" ? `Месечно (${r.dayOfMonth})` : "Седмично"}</TableCell>
                        <TableCell>{r.nextDate}</TableCell>
                        <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                        <TableCell>
                          <Badge variant={r.active ? "default" : "secondary"} className="text-xs">
                            {r.active ? "Активен" : "Паузиран"}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleToggle(r.id, r.active)}>
                                {r.active ? "⏸" : "▶️"}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(r.id)}>🗑️</Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Нова периодична фактура</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Клиент *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Избери" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.companyName || c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Име *</Label>
                <Input className="h-9" placeholder="напр. Месечна поддръжка" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Период</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Месечно</SelectItem>
                    <SelectItem value="weekly">Седмично</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ден от месеца</Label>
                <Input type="number" min="1" max="31" className="h-9" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Следваща дата *</Label>
                <Input type="date" className="h-9" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Забележка</Label>
                <Input className="h-9" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="mt-4">
              <Label className="text-xs">Редове</Label>
              <div className="space-y-2 mt-1">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Input className="h-9" placeholder="Описание" value={it.description} onChange={(e) => setItem(idx, "description", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input className="h-9" placeholder="Ед." value={it.unit} onChange={(e) => setItem(idx, "unit", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input className="h-9" type="number" step="0.01" placeholder="К-во" value={it.quantity} onChange={(e) => setItem(idx, "quantity", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input className="h-9" type="number" step="0.01" placeholder="Цена €" value={it.price} onChange={(e) => setItem(idx, "price", e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Input className="h-9" type="number" step="1" value={it.vatRate} onChange={(e) => setItem(idx, "vatRate", e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Button size="sm" variant="ghost" onClick={() => removeItem(idx)} disabled={items.length === 1}>✕</Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" className="mt-2" onClick={addItem}>+ Добави ред</Button>
            </div>

            <Button className="mt-4" onClick={handleAdd} disabled={saving}>{saving ? "Запис..." : "Запиши"}</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
