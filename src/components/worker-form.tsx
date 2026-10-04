"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hourlyFromDaily } from "@/lib/acts";

// Форма за нов работник и за редакция (workerId).
export function WorkerForm({ workerId }: { workerId?: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", dailyRate: "", overtimeRate: "", hireDate: "", notes: "", status: "active" });

  useEffect(() => {
    if (!workerId) return;
    fetch(`/api/workers/${workerId}`).then(r => r.json()).then(w => setForm({
      name: w.name || "", phone: w.phone || "",
      dailyRate: w.dailyRate != null ? String(w.dailyRate) : "",
      overtimeRate: w.overtimeRate != null ? String(w.overtimeRate) : "",
      hireDate: w.hireDate || "", notes: w.notes || "", status: w.status || "active",
    }));
  }, [workerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(workerId ? `/api/workers/${workerId}` : "/api/workers", {
      method: workerId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) router.push("/workers");
    else {
      setError((await res.json().catch(() => null))?.error || "Грешка при запис");
      setSaving(false);
    }
  }

  const hourly = hourlyFromDaily(parseFloat(form.dailyRate));

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">👷 {workerId ? "Редакция на работник" : "Нов работник"}</h1>
      <Card>
        <CardHeader><CardTitle>Данни</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Име *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Телефон</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div>
              <Label>Дневна ставка (€ за 8 ч) *</Label>
              <Input type="number" step="0.01" min="0" value={form.dailyRate} onChange={e => setForm({ ...form, dailyRate: e.target.value })} />
              {hourly > 0 && <p className="text-xs text-muted-foreground mt-1">= {hourly} €/ч (ползва се в актовете и ведомостта)</p>}
              {workerId && <p className="text-xs text-muted-foreground">Промяната важи за нови явки и актове — вече записаните остават по старата ставка.</p>}
            </div>
            <div>
              <Label>Извънреден труд (€/ч)</Label>
              <Input type="number" step="0.01" min="0" value={form.overtimeRate} onChange={e => setForm({ ...form, overtimeRate: e.target.value })}
                placeholder={hourly > 0 ? `по подразбиране ${Math.round(hourly * 1.5 * 100) / 100} (часова × 1.5)` : ""} />
            </div>
            <div><Label>Дата на наемане</Label><Input type="date" value={form.hireDate} onChange={e => setForm({ ...form, hireDate: e.target.value })} /></div>
            {workerId && (
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={form.status === "active" ? "default" : "outline"} onClick={() => setForm({ ...form, status: "active" })}>✅ Активен</Button>
                <Button type="button" size="sm" variant={form.status === "inactive" ? "default" : "outline"} onClick={() => setForm({ ...form, status: "inactive" })}>❌ Неактивен</Button>
              </div>
            )}
            <div><Label>Бележки</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>{saving ? "Записване..." : "💾 Запис"}</Button>
              <Button variant="outline" type="button" onClick={() => router.back()}>Отказ</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
