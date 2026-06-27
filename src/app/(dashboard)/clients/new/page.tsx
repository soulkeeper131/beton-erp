"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, CheckCircle } from "lucide-react";

const isValidEik = (v: string) => /^\d{9}$/.test(v) || /^\d{13}$/.test(v);

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [eikFound, setEikFound] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", companyName: "",
    eik: "", vatNumber: "", address: "", notes: ""
  });
  const lastSearched = useRef("");

  const update = (f: string, v: string) => {
    setForm({ ...form, [f]: v });
    if (f === "eik") setEikFound(false);
  };

  // Auto-trigger when EIK reaches exactly 9 or 13 digits
  useEffect(() => {
    if (!isValidEik(form.eik) || form.eik === lastSearched.current || searching) return;
    lastSearched.current = form.eik;
    handleEikSearch();
  }, [form.eik]);

  async function handleEikSearch() {
    if (!isValidEik(form.eik)) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/companybook?eik=${form.eik}`);
      const data = await res.json();
      if (data.error) { alert(data.error); setSearching(false); return; }
      setForm(prev => ({
        ...prev,
        companyName: prev.companyName || data.name || "",
        address: prev.address || data.address || "",
        name: prev.name || data.nameLatin || "",
      }));
      setEikFound(true);
    } catch { alert("Грешка при търсене"); }
    setSearching(false);
  }

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
      <Card><CardHeader><CardTitle>Данни</CardTitle></CardHeader><CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Име *</Label><Input value={form.name} onChange={e => update("name", e.target.value)} /></div>
            <div><Label>Фирма</Label><Input value={form.companyName} onChange={e => update("companyName", e.target.value)} /></div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Label>ЕИК</Label>
              <div className="relative">
                <Input value={form.eik} onChange={e => update("eik", e.target.value)} className={eikFound ? "pr-8 border-green-500" : ""} />
                {searching && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">...</span>}
                {eikFound && <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleEikSearch} disabled={searching || !isValidEik(form.eik)} className="h-10 gap-1">
              <Search className="h-4 w-4" /> {searching ? "..." : "Търси"}
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
