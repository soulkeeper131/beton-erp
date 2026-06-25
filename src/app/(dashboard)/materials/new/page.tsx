"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewMaterialPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "кг", quantity: "", minThreshold: "", pricePerUnit: "", notes: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.unit) return;
    setSaving(true);
    const res = await fetch("/api/materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) router.push("/materials");
    else { alert("Грешка"); setSaving(false); }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">📦 Нов материал</h1>
      <Card><CardHeader><CardTitle>Данни</CardTitle></CardHeader><CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Име *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Мерна единица *</Label><Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="кг, тон, м³, бр." /></div>
          <div><Label>Количество</Label><Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} /></div>
          <div><Label>Мин. праг</Label><Input type="number" value={form.minThreshold} onChange={e => setForm({...form, minThreshold: e.target.value})} /></div>
          <div><Label>Цена за единица (лв)</Label><Input type="number" value={form.pricePerUnit} onChange={e => setForm({...form, pricePerUnit: e.target.value})} /></div>
          <div><Label>Бележки</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? "Записване..." : "💾 Запис"}</Button>
            <Button variant="outline" type="button" onClick={() => router.back()}>Отказ</Button>
          </div>
        </form>
      </CardContent></Card>
    </div>
  );
}
