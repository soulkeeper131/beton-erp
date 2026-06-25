"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewWorkerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", dailyRate: "", overtimeRate: "", hireDate: "", notes: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.dailyRate) return;
    setSaving(true);
    const res = await fetch("/api/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) router.push("/workers");
    else { alert("Грешка"); setSaving(false); }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">👷 Нов работник</h1>
      <Card>
        <CardHeader><CardTitle>Данни</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Име *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label>Телефон</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><Label>Дневна ставка (лв) *</Label><Input type="number" value={form.dailyRate} onChange={e => setForm({...form, dailyRate: e.target.value})} /></div>
            <div><Label>Извънреден труд (лв/ч)</Label><Input type="number" value={form.overtimeRate} onChange={e => setForm({...form, overtimeRate: e.target.value})} /></div>
            <div><Label>Дата на наемане</Label><Input type="date" value={form.hireDate} onChange={e => setForm({...form, hireDate: e.target.value})} /></div>
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
