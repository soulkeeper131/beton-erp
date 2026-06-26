"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function NewServicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "other", unit: "бр.", basePrice: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    const res = await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) router.push("/services");
    else { alert("Грешка"); setSaving(false); }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🔧 Нова услуга</h1>
      <Card><CardHeader><CardTitle>Данни</CardTitle></CardHeader><CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Име *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Описание</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Категория</Label>
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="concrete">🧱 Бетон</SelectItem>
                  <SelectItem value="grinding">✨ Шлайфане</SelectItem>
                  <SelectItem value="finishing">🎨 Довършителни</SelectItem>
                  <SelectItem value="waterproofing">💧 Хидроизолация</SelectItem>
                  <SelectItem value="other">🔧 Друго</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Мерна единица</Label><Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} /></div>
          </div>
          <div><Label>Базова цена (лв)</Label><Input type="number" value={form.basePrice} onChange={e => setForm({...form, basePrice: e.target.value})} /></div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? "Записване..." : "💾 Запис"}</Button>
            <Button variant="outline" type="button" onClick={() => router.back()}>Отказ</Button>
          </div>
        </form>
      </CardContent></Card>
    </div>
  );
}
