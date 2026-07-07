"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";

const emptyItem = { concreteTypeId: "", materialId: "", machineId: "", actionName: "", description: "", quantity: "1", unit: "бр.", pricePerUnit: "0" };

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", category: "other", unit: "бр.", basePrice: "" });
  const [concreteTypes, setConcreteTypes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/concrete-types").then(r => r.json()),
      fetch("/api/materials").then(r => r.json()),
      fetch("/api/machines").then(r => r.json()),
      fetch(`/api/services/${id}`).then(r => r.json()),
      fetch(`/api/services/${id}/items`).then(r => r.json()),
    ]).then(([ct, mat, mach, svc, svcItems]) => {
      setConcreteTypes(ct);
      setMaterials(mat);
      setMachines(mach);
      if (svc && !svc.error) {
        setForm({ name: svc.name || "", description: svc.description || "", category: svc.category || "other", unit: svc.unit || "бр.", basePrice: svc.basePrice ? String(svc.basePrice) : "" });
      }
      if (Array.isArray(svcItems) && svcItems.length > 0) {
        setItems(svcItems.map((i: any) => ({
          concreteTypeId: i.concreteTypeId ? String(i.concreteTypeId) : "",
          materialId: i.materialId ? String(i.materialId) : "",
          machineId: i.machineId ? String(i.machineId) : "",
          actionName: i.actionName || "",
          description: i.description || "",
          quantity: String(i.quantity),
          unit: i.unit || "бр.",
          pricePerUnit: String(i.pricePerUnit),
        })));
      } else {
        setItems([{ ...emptyItem }]);
      }
      setLoading(false);
    });
  }, [id]);

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, f: string, v: any) => {
    const copy = [...items]; (copy[i] as any)[f] = v; setItems(copy);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);

    const res = await fetch(`/api/services/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { alert("Грешка при обновяване"); setSaving(false); return; }

    // Delete old items
    const existing = await fetch(`/api/services/${id}/items`).then(r => r.json());
    for (const ei of (Array.isArray(existing) ? existing : [])) {
      await fetch(`/api/services/${id}/items?itemId=${ei.id}`, { method: "DELETE" });
    }

    // Create new items
    for (const item of items) {
      if (!item.concreteTypeId && !item.materialId && !item.machineId && !item.actionName) continue;
      await fetch(`/api/services/${id}/items`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concreteTypeId: item.concreteTypeId ? parseInt(item.concreteTypeId) : null,
          materialId: item.materialId ? parseInt(item.materialId) : null,
          machineId: item.machineId ? parseInt(item.machineId) : null,
          actionName: item.actionName || null,
          description: item.description || null,
          quantity: parseFloat(item.quantity) || 1,
          unit: item.unit,
          pricePerUnit: parseFloat(item.pricePerUnit) || 0,
        }),
      });
    }
    router.push("/services");
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">🔧 Редактиране на услуга</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card><CardHeader><CardTitle>Основна информация</CardTitle></CardHeader><CardContent className="space-y-4">
          <div><Label>Име *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Описание</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Категория</Label>
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="concrete">🧱 Бетон</SelectItem><SelectItem value="grinding">✨ Шлайфане</SelectItem>
                  <SelectItem value="finishing">🎨 Довършителни</SelectItem><SelectItem value="waterproofing">💧 Хидроизолация</SelectItem>
                  <SelectItem value="other">🔧 Друго</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Мерна единица</Label><Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} /></div>
          </div>
        </CardContent></Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Варианти на услугата</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Добави вариант</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Вариант {idx + 1}</span>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3" /></Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Име на действие</Label><Input className="h-8 text-sm" value={item.actionName} onChange={e => updateItem(idx, "actionName", e.target.value)} placeholder="напр. Полагане" /></div>
                  <div><Label className="text-xs">Описание (детайли)</Label><Input className="h-8 text-sm" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="5см, с фибри" /></div>
                  <div><Label className="text-xs">Тип бетон</Label>
                    <Select value={item.concreteTypeId} onValueChange={v => updateItem(idx, "concreteTypeId", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{concreteTypes.map((ct: any) => <SelectItem key={ct.id} value={String(ct.id)}>{ct.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Материал</Label>
                    <Select value={item.materialId} onValueChange={v => updateItem(idx, "materialId", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{materials.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Помпа/машина</Label>
                    <Select value={item.machineId} onValueChange={v => updateItem(idx, "machineId", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Без</SelectItem>
                        {machines.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.type})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">М.Е.</Label><Input className="h-8 text-sm" value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)} /></div>
                  <div><Label className="text-xs">К-во</Label><Input type="number" className="h-8 text-sm" value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} /></div>
                  <div><Label className="text-xs">Цена/ед. (лв)</Label><Input type="number" step="0.01" className="h-8 text-sm" value={item.pricePerUnit} onChange={e => updateItem(idx, "pricePerUnit", e.target.value)} /></div>
                </div>
              </div>
            ))}
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
