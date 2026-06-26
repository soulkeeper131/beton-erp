"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: "", companyNameBG: "", eik: "", vatNumber: "",
    address: "", city: "", phone: "", email: "", mol: "",
    bankName: "", iban: "", bic: "",
  });

  useEffect(() => {
    fetch("/api/company-settings").then(r => r.json()).then(d => {
      if (d && !d.error) setForm({
        companyName: d.companyName || "", companyNameBG: d.companyNameBG || "",
        eik: d.eik || "", vatNumber: d.vatNumber || "",
        address: d.address || "", city: d.city || "",
        phone: d.phone || "", email: d.email || "", mol: d.mol || "",
        bankName: d.bankName || "", iban: d.iban || "", bic: d.bic || "",
      });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/company-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) alert("✅ Запазено");
    else alert("❌ Грешка");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">⚙️ Настройки</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Данни за фирмата</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Име на фирма</Label><Input value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} /></div>
              <div className="space-y-2"><Label>Име на кирилица</Label><Input value={form.companyNameBG} onChange={e => setForm({...form, companyNameBG: e.target.value})} /></div>
              <div className="space-y-2"><Label>ЕИК</Label><Input value={form.eik} onChange={e => setForm({...form, eik: e.target.value})} /></div>
              <div className="space-y-2"><Label>ДДС номер (BG...)</Label><Input value={form.vatNumber} onChange={e => setForm({...form, vatNumber: e.target.value})} /></div>
              <div className="space-y-2"><Label>Град</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
              <div className="space-y-2"><Label>Адрес</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
              <div className="space-y-2"><Label>Телефон</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div className="space-y-2"><Label>Имейл</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="space-y-2 md:col-span-2"><Label>МОЛ</Label><Input value={form.mol} onChange={e => setForm({...form, mol: e.target.value})} /></div>
              <div className="space-y-2"><Label>Банка</Label><Input value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} /></div>
              <div className="space-y-2"><Label>IBAN</Label><Input value={form.iban} onChange={e => setForm({...form, iban: e.target.value})} /></div>
              <div className="space-y-2"><Label>BIC</Label><Input value={form.bic} onChange={e => setForm({...form, bic: e.target.value})} /></div>
            </div>
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Запазване..." : "Запази"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
