"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewSitePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    clientId: "",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then(d => setClients(d));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({...form, clientId: Number(form.clientId)}),
    });
    if (res.ok) router.push("/sites");
    else { alert("Грешка при създаване"); setSaving(false); }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🏗️ Нов обект</h1>
      <Card>
        <CardHeader><CardTitle>Данни за обекта</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Име *</Label>
              <Input id="name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="ул. Витоша 15" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Град/Село</Label>
              <Input id="city" value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="гр. София" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Адрес</Label>
              <Input id="address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="ул. Витоша 15" />
            </div>
            <div className="space-y-2">
              <Label>Клиент</Label>
              <Select value={form.clientId} onValueChange={v => setForm({...form, clientId: v})}>
                <SelectTrigger><SelectValue placeholder="Изберете клиент" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="completed">Завършен</SelectItem>
                  <SelectItem value="paused">Паузиран</SelectItem>
                </SelectContent>
              </Select>
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
