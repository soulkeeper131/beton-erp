"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

const typeLabels: Record<string, string> = {
  mixer: "🚛 Бетоновоз", pump: "🏗️ Помпа", truck: "🚚 Камион",
  bus: "🚌 Бус", car: "🚗 Лек", polisher: "✨ Полираща", other: "🔧 Друго"
};
const maintTypeLabels: Record<string, string> = {
  repair: "🔧 Ремонт", scheduled: "📅 Планова", inspection: "🔍 Преглед",
  vignette: "🛣️ Винетка", insurance: "🛡️ ГО", other: "📋 Друго"
};

export default function EditMachinePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [repairs, setRepairs] = useState<any[]>([]);
  const [newRepair, setNewRepair] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "repair", description: "", cost: 0, provider: "", mileageAtRepair: 0, notes: ""
  });

  useEffect(() => {
    fetch(`/api/machines/${id}`).then(r => r.json()).then(d => {
      if (!d.error) {
        setForm(d);
        setRepairs(d.repairs || []);
      }
      setLoading(false);
    });
  }, [id]);

  const update = (f: string, v: any) => setForm({...form, [f]: v});

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/machines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) router.push("/machines");
    else { alert("Грешка"); setSaving(false); }
  }

  async function addRepair() {
    if (!newRepair.description) return;
    const res = await fetch(`/api/machines/${id}/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRepair),
    });
    if (res.ok) {
      const r = await res.json();
      setRepairs([r, ...repairs]);
      setNewRepair({ date: new Date().toISOString().split("T")[0], type: "repair", description: "", cost: 0, provider: "", mileageAtRepair: 0, notes: "" });
    }
  }

  async function deleteRepair(repairId: number) {
    if (!confirm("Изтриване на ремонт?")) return;
    await fetch(`/api/machines/${id}/maintenance/${repairId}`, { method: "DELETE" });
    setRepairs(repairs.filter(r => r.id !== repairId));
  }

  const exp = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
    return ` (${days < 0 ? "🔴 изтекла" : days < 30 ? `🟠 ${days}д` : `🟢 ${days}д`})`;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">✏️ {form.name || "Машина"}</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Основна информация */}
        <Card>
          <CardHeader><CardTitle>Основна информация</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Име *</Label><Input value={form.name || ""} onChange={e => update("name", e.target.value)} /></div>
              <div>
                <Label>Тип</Label>
                <Select value={form.type || "other"} onValueChange={v => update("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Рег. номер</Label><Input value={form.plateNumber || ""} onChange={e => update("plateNumber", e.target.value)} /></div>
              <div><Label>Гориво</Label><Input value={form.fuelType || ""} onChange={e => update("fuelType", e.target.value)} /></div>
              <div><Label>Година</Label><Input value={form.year || ""} onChange={e => update("year", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>VIN / Рама</Label><Input value={form.vin || ""} onChange={e => update("vin", e.target.value)} /></div>
              <div><Label>Километраж</Label><Input type="number" value={form.mileage || 0} onChange={e => update("mileage", parseInt(e.target.value) || 0)} /></div>
            </div>
            <div>
              <Label>Статус</Label>
              <Select value={form.status || "available"} onValueChange={v => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">✅ Свободна</SelectItem>
                  <SelectItem value="in_use">🔴 Заета</SelectItem>
                  <SelectItem value="maintenance">🔧 Ремонт</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Локация</Label><Input value={form.location || ""} onChange={e => update("location", e.target.value)} /></div>
              <div><Label>Бележки</Label><Input value={form.notes || ""} onChange={e => update("notes", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Документи */}
        <Card>
          <CardHeader><CardTitle>📅 Документи и валидности</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Винетка до{exp(form.vignetteExpiry)}</Label><Input type="date" value={form.vignetteExpiry || ""} onChange={e => update("vignetteExpiry", e.target.value)} /></div>
              <div><Label>ГО до{exp(form.insuranceExpiry)}</Label><Input type="date" value={form.insuranceExpiry || ""} onChange={e => update("insuranceExpiry", e.target.value)} /></div>
              <div><Label>Тех. преглед до{exp(form.techInspectionExpiry)}</Label><Input type="date" value={form.techInspectionExpiry || ""} onChange={e => update("techInspectionExpiry", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>💾 {saving ? "Запазване..." : "Запис"}</Button>
          <Button variant="outline" type="button" onClick={() => router.back()}>Отказ</Button>
        </div>
      </form>

      {/* Ремонти */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>🔧 Ремонти и поддръжка</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* New repair form */}
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <span className="text-xs font-medium">Нов запис</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div><Label className="text-xs">Дата</Label><Input type="date" className="h-8 text-sm" value={newRepair.date} onChange={e => setNewRepair({...newRepair, date: e.target.value})} /></div>
              <div>
                <Label className="text-xs">Тип</Label>
                <Select value={newRepair.type} onValueChange={v => setNewRepair({...newRepair, type: v})}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(maintTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Км</Label><Input type="number" className="h-8 text-sm" value={newRepair.mileageAtRepair} onChange={e => setNewRepair({...newRepair, mileageAtRepair: parseInt(e.target.value) || 0})} /></div>
              <div><Label className="text-xs">Сума (лв)</Label><Input type="number" step="0.01" className="h-8 text-sm" value={newRepair.cost} onChange={e => setNewRepair({...newRepair, cost: parseFloat(e.target.value) || 0})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Описание *</Label><Input className="h-8 text-sm" value={newRepair.description} onChange={e => setNewRepair({...newRepair, description: e.target.value})} placeholder="напр. Смяна на масло" /></div>
              <div><Label className="text-xs">Извършител</Label><Input className="h-8 text-sm" value={newRepair.provider} onChange={e => setNewRepair({...newRepair, provider: e.target.value})} placeholder="Сервиз Х" /></div>
            </div>
            <div className="flex justify-between items-center">
              <Input className="h-8 text-sm w-1/2" value={newRepair.notes} onChange={e => setNewRepair({...newRepair, notes: e.target.value})} placeholder="Бележки" />
              <Button type="button" size="sm" onClick={addRepair} disabled={!newRepair.description} className="gap-1">
                <Plus className="h-3 w-3" /> Добави
              </Button>
            </div>
          </div>

          {/* Repairs list */}
          {repairs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Няма записи за ремонти</p>
          ) : (
            <div className="space-y-2">
              {repairs.map((r: any) => (
                <div key={r.id} className="flex items-start justify-between border rounded-lg p-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{maintTypeLabels[r.type] || r.type}</span>
                      <span className="text-xs text-muted-foreground">{r.date}</span>
                      {r.mileageAtRepair > 0 && <span className="text-xs text-muted-foreground">│ {r.mileageAtRepair} км</span>}
                    </div>
                    <p className="text-sm">{r.description}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {r.cost > 0 && <span>{r.cost.toFixed(2)} лв</span>}
                      {r.provider && <span>│ {r.provider}</span>}
                      {r.notes && <span>│ {r.notes}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteRepair(r.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
