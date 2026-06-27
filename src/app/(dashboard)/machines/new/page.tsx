"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const typeLabels: Record<string, string> = {
  mixer: "🚛 Бетоновоз", pump: "🏗️ Помпа", truck: "🚚 Камион",
  bus: "🚌 Бус", car: "🚗 Лек автомобил", polisher: "✨ Полираща", other: "🔧 Друго"
};

export default function NewMachinePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "mixer", category: "other",
    plateNumber: "", fuelType: "", year: "", vin: "", mileage: 0,
    vignetteExpiry: "", insuranceExpiry: "", techInspectionExpiry: "",
    location: "", notes: ""
  });

  const update = (f: string, v: any) => setForm({...form, [f]: v});

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
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🚛 Нова машина</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основна информация */}
        <Card>
          <CardHeader><CardTitle>Основна информация</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Име *</Label><Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="напр. Бетоновоз МАН" /></div>
              <div>
                <Label>Тип *</Label>
                <Select value={form.type} onValueChange={v => update("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Рег. номер</Label><Input value={form.plateNumber} onChange={e => update("plateNumber", e.target.value)} /></div>
              <div><Label>Гориво</Label><Input value={form.fuelType} onChange={e => update("fuelType", e.target.value)} placeholder="дизел, бензин, ток" /></div>
              <div><Label>Година</Label><Input value={form.year} onChange={e => update("year", e.target.value)} placeholder="2020" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>VIN / Рама</Label><Input value={form.vin} onChange={e => update("vin", e.target.value)} /></div>
              <div><Label>Километраж</Label><Input type="number" value={form.mileage} onChange={e => update("mileage", parseInt(e.target.value) || 0)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Локация</Label><Input value={form.location} onChange={e => update("location", e.target.value)} /></div>
              <div><Label>Бележки</Label><Input value={form.notes} onChange={e => update("notes", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Документи и валидности */}
        <Card>
          <CardHeader><CardTitle>📅 Документи и валидности</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Винетка до</Label><Input type="date" value={form.vignetteExpiry} onChange={e => update("vignetteExpiry", e.target.value)} /></div>
              <div><Label>ГО до</Label><Input type="date" value={form.insuranceExpiry} onChange={e => update("insuranceExpiry", e.target.value)} /></div>
              <div><Label>Тех. преглед до</Label><Input type="date" value={form.techInspectionExpiry} onChange={e => update("techInspectionExpiry", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Записване..." : "💾 Запис"}</Button>
          <Button variant="outline" type="button" onClick={() => router.back()}>Отказ</Button>
        </div>
      </form>
    </div>
  );
}
