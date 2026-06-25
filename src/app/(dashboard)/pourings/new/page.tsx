"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function NewPouringPage() {
  const router = useRouter();
  const [sites, setSites] = useState<any[]>([]);
  const [concreteTypes, setConcreteTypes] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    siteId: "",
    date: new Date().toISOString().split("T")[0],
    concreteTypeId: "",
    quantityM3: "",
    machineId: "",
    weather: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/sites").then(r => r.json()).then(setSites);
    fetch("/api/concrete-types").then(r => r.json()).then(setConcreteTypes);
    fetch("/api/machines").then(r => r.json()).then(setMachines);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.siteId || !form.concreteTypeId || !form.quantityM3) return;
    setSaving(true);

    const res = await fetch("/api/pourings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        siteId: parseInt(form.siteId),
        concreteTypeId: parseInt(form.concreteTypeId),
        quantityM3: parseFloat(form.quantityM3),
        machineId: form.machineId ? parseInt(form.machineId) : null,
      }),
    });

    if (res.ok) {
      router.push("/pourings");
    } else {
      alert("Грешка при запис");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">📋 Ново актуване</h1>

      <Card>
        <CardHeader><CardTitle>Данни за изливането</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Обект *</Label>
              <Select value={form.siteId} onValueChange={(v) => setForm({ ...form, siteId: v })}>
                <SelectTrigger><SelectValue placeholder="Избери обект" /></SelectTrigger>
                <SelectContent>
                  {sites.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Дата *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>

            <div>
              <Label>Тип бетон *</Label>
              <Select value={form.concreteTypeId} onValueChange={(v) => setForm({ ...form, concreteTypeId: v })}>
                <SelectTrigger><SelectValue placeholder="Избери тип бетон" /></SelectTrigger>
                <SelectContent>
                  {concreteTypes.map((ct: any) => (
                    <SelectItem key={ct.id} value={String(ct.id)}>
                      {ct.name} — {ct.pricePerM3} лв/m³
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Количество (m³) *</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={form.quantityM3}
                onChange={(e) => setForm({ ...form, quantityM3: e.target.value })}
              />
            </div>

            <div>
              <Label>Машина</Label>
              <Select value={form.machineId} onValueChange={(v) => setForm({ ...form, machineId: v })}>
                <SelectTrigger><SelectValue placeholder="Без машина" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Без машина</SelectItem>
                  {machines.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Време</Label>
              <Input value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} placeholder="Слънчево, дъжд..." />
            </div>

            <div>
              <Label>Бележки</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Записване..." : "💾 Запис"}
              </Button>
              <Button variant="outline" type="button" onClick={() => router.back()}>Отказ</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
