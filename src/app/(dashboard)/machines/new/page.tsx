"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewMachinePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", type: "mixer", plateNumber: "", fuelType: "", location: "", notes: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    const res = await fetch("/api/machines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) router.push("/machines");
    else { alert("Грешка"); setSaving(false); }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🚛 Нова машина</h1>
      <Card>
        <CardHeader><CardTitle>Данни</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Име *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div>
              <Label>Тип *</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixer">🚛 Миксер</SelectItem>
                  <SelectItem value="pump">🏗️ Помпа</SelectItem>
                  <SelectItem value="vibrator">〰️ Вибратор</SelectItem>
                  <SelectItem value="other">🔧 Друго</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Рег. номер</Label><Input value={form.plateNumber} onChange={e => setForm({...form, plateNumber: e.target.value})} /></div>
            <div><Label>Гориво</Label><Input value={form.fuelType} onChange={e => setForm({...form, fuelType: e.target.value})} /></div>
            <div><Label>Локация</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
            <div><Label>Бележки</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
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
