"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, ArrowLeft, Loader2 } from "lucide-react";

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", companyName: "",
    eik: "", vatNumber: "", address: "", notes: ""
  });

  useEffect(() => {
    fetch(`/api/clients/${id}`).then(r => r.json()).then(d => {
      if (!d.error) setForm({
        name: d.name || "", email: d.email || "", phone: d.phone || "",
        companyName: d.companyName || "", eik: d.eik || "",
        vatNumber: d.vatNumber || "", address: d.address || "", notes: d.notes || ""
      });
      setLoading(false);
    });
  }, [id]);

  const update = (f: string, v: string) => setForm({ ...form, [f]: v });

  async function handleEikSearch() {
    if (!form.eik || form.eik.length < 9) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/companybook?eik=${form.eik}`);
      const data = await res.json();
      if (data.error) { alert(data.error); setSearching(false); return; }
      setForm(prev => ({
        ...prev,
        companyName: prev.companyName || data.name || "",
        address: prev.address || data.address || "",
      }));
    } catch { alert("Грешка при търсене"); }
    setSearching(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) router.push("/clients");
    else { alert("Грешка"); setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">✏️ Редактиране на клиент</h1>
      </div>
      <Card><CardHeader><CardTitle>Данни</CardTitle></CardHeader><CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Име *</Label><Input value={form.name} onChange={e => update("name", e.target.value)} /></div>
            <div><Label>Фирма</Label><Input value={form.companyName} onChange={e => update("companyName", e.target.value)} /></div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Label>ЕИК</Label><Input value={form.eik} onChange={e => update("eik", e.target.value)} /></div>
            <Button type="button" variant="outline" size="sm" onClick={handleEikSearch} disabled={searching} className="h-10 gap-1">
              <Search className="h-4 w-4" /> {searching ? "Търси..." : "Търси"}
            </Button>
          </div>
          <div><Label>ДДС №</Label><Input value={form.vatNumber} onChange={e => update("vatNumber", e.target.value)} /></div>
          <div><Label>Адрес</Label><Input value={form.address} onChange={e => update("address", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Имейл</Label><Input value={form.email} onChange={e => update("email", e.target.value)} /></div>
            <div><Label>Телефон</Label><Input value={form.phone} onChange={e => update("phone", e.target.value)} /></div>
          </div>
          <div><Label>Бележки</Label><Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} /></div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? "Записване..." : "💾 Запис"}</Button>
            <Button variant="outline" type="button" onClick={() => router.back()}>Отказ</Button>
          </div>
        </form>
      </CardContent></Card>
    </div>
  );
}
