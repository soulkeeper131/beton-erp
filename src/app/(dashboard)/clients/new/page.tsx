"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", notes: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) router.push("/clients");
    else { alert("Грешка при създаване"); setSaving(false); }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">👥 Нов клиент</h1>
      <Card>
        <CardHeader><CardTitle>Данни за клиента</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Име *</Label>
              <Input id="name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Иван Иванов" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Имейл</Label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Фирма</Label>
              <Input id="company" value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Бележки</Label>
              <Input id="notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Записване..." : "Запази"}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Отказ</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
