"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ clientId: "", number: "", date: new Date().toISOString().split("T")[0], dueDate: "", type: "invoice" });

  useEffect(() => { fetch("/api/clients").then(r => r.json()).then(setClients); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.number || !form.dueDate) return;
    setSaving(true);
    const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) router.push("/invoices");
    else { alert("Грешка"); setSaving(false); }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🧾 Нова фактура</h1>
      <Card><CardHeader><CardTitle>Данни</CardTitle></CardHeader><CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Клиент *</Label>
            <Select value={form.clientId} onValueChange={(v) => setForm({...form, clientId: v})}>
              <SelectTrigger><SelectValue placeholder="Избери клиент" /></SelectTrigger>
              <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Номер *</Label><Input value={form.number} onChange={e => setForm({...form, number: e.target.value})} /></div>
          <div><Label>Дата *</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
          <div><Label>Падеж *</Label><Input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} /></div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? "Записване..." : "💾 Запис"}</Button>
            <Button variant="outline" type="button" onClick={() => router.back()}>Отказ</Button>
          </div>
        </form>
      </CardContent></Card>
    </div>
  );
}
