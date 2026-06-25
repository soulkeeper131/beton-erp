"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function PouredDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [poured, setPoured] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [concreteTypes, setConcreteTypes] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    fetch(`/api/pourings/${params.id}`).then(r => r.json()).then(data => {
      setPoured(data);
      setForm({
        siteId: String(data.siteId || ""),
        date: data.date || "",
        concreteTypeId: String(data.concreteTypeId || ""),
        quantityM3: String(data.quantityM3 || ""),
        machineId: data.machineId ? String(data.machineId) : "",
        weather: data.weather || "",
        notes: data.notes || "",
      });
    });
    fetch("/api/sites").then(r => r.json()).then(setSites);
    fetch("/api/concrete-types").then(r => r.json()).then(setConcreteTypes);
    fetch("/api/machines").then(r => r.json()).then(setMachines);
  }, [params.id]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/pourings/${params.id}`, {
      method: "PATCH",
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
      const updated = await res.json();
      setPoured(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  if (!poured) return <div className="p-6">Зареждане...</div>;

  const total = poured.concreteType && poured.quantityM3
    ? (poured.concreteType.pricePerM3 * poured.quantityM3).toFixed(2)
    : "—";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📋 Актуване</h1>
        <Button variant="outline" onClick={() => setEditing(!editing)}>
          {editing ? "Отказ" : "✏️ Редакция"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Детайли</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Обект</Label>
              {editing ? (
                <Select value={form.siteId} onValueChange={(v) => setForm({ ...form, siteId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sites.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{poured.site?.name || "—"}</p>
              )}
            </div>

            <div>
              <Label>Тип бетон</Label>
              {editing ? (
                <Select value={form.concreteTypeId} onValueChange={(v) => setForm({ ...form, concreteTypeId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {concreteTypes.map((ct: any) => (
                      <SelectItem key={ct.id} value={String(ct.id)}>{ct.name} — {ct.pricePerM3} лв</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{poured.concreteType?.name || "—"} ({poured.concreteType?.pricePerM3 || 0} лв/m³)</p>
              )}
            </div>

            <div>
              <Label>Количество (m³)</Label>
              {editing ? (
                <Input type="number" step="0.5" value={form.quantityM3} onChange={(e) => setForm({ ...form, quantityM3: e.target.value })} />
              ) : (
                <p className="text-lg font-bold">{poured.quantityM3} m³</p>
              )}
            </div>

            <div>
              <Label>Обща стойност</Label>
              <p className="text-lg font-bold text-orange-600">{total} лв</p>
            </div>

            <div>
              <Label>Дата</Label>
              {editing ? (
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              ) : (
                <p className="text-sm">{poured.date}</p>
              )}
            </div>

            <div>
              <Label>Машина</Label>
              {editing ? (
                <Select value={form.machineId} onValueChange={(v) => setForm({ ...form, machineId: v })}>
                  <SelectTrigger><SelectValue placeholder="Без машина" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Без машина</SelectItem>
                    {machines.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{poured.machine?.name || "—"}</p>
              )}
            </div>

            <div>
              <Label>Време</Label>
              {editing ? (
                <Input value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} />
              ) : (
                <p className="text-sm">{poured.weather || "—"}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Бележки</Label>
            {editing ? (
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            ) : (
              <p className="text-sm">{poured.notes || "—"}</p>
            )}
          </div>

          {editing && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Записване..." : "💾 Запис"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
