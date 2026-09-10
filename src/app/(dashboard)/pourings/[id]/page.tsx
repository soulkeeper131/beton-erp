"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Trash2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PhotoGallery } from "@/components/photo-gallery";
import { useIsAdmin } from "@/lib/use-is-admin";
import { formatCurrency } from "@/lib/utils";

export default function PouredDetailPage() {
  const router = useRouter();
  const params = useParams();
  const isAdmin = useIsAdmin();
  const [poured, setPoured] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [concreteTypes, setConcreteTypes] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editWorkers, setEditWorkers] = useState<any[]>([]);
  const [editMaterials, setEditMaterials] = useState<any[]>([]);
  const [offerData, setOfferData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/pourings/${params.id}`).then(r => r.json()).then(data => {
      setPoured(data);
      setForm({
        siteId: String(data.siteId || ""),
        date: data.date || "",
        machineId: data.machineId ? String(data.machineId) : "",
        weather: data.weather || "",
        notes: data.notes || "",
      });
      setEditItems((data.items || []).map((i: any) => ({
        concreteTypeId: i.concreteTypeId ? String(i.concreteTypeId) : "",
        quantityM3: String(i.quantityM3 || ""),
        pricePerM3: String(i.pricePerM3 || ""),
      })));
      if (!data.items || data.items.length === 0) {
        setEditItems([{ concreteTypeId: "", quantityM3: "", pricePerM3: "" }]);
      }
      setEditWorkers((data.workers || []).map((w: any) => ({
        workerId: w.workerId ? String(w.workerId) : "",
        hours: String(w.hours || ""),
        rate: String(w.rate || ""),
      })));
      setEditMaterials((data.materials || []).map((m: any) => ({
        materialId: m.materialId ? String(m.materialId) : "",
        quantity: String(m.quantity || ""),
      })));
      // Load linked offer if exists
      if (data.offerId) {
        fetch(`/api/offers/${data.offerId}`).then(r => r.json()).then(setOfferData);
      }
    });
    fetch("/api/sites").then(r => r.json()).then(setSites);
    fetch("/api/concrete-types").then(r => r.json()).then(setConcreteTypes);
    fetch("/api/machines").then(r => r.json()).then(setMachines);
    fetch("/api/workers").then(r => r.json()).then(setWorkers);
    fetch("/api/materials").then(r => r.json()).then(setMaterialsList);
  }, [params.id]);

  const addEditItem = () => setEditItems([...editItems, { concreteTypeId: "", quantityM3: "", pricePerM3: "" }]);
  const removeEditItem = (idx: number) => setEditItems(editItems.filter((_, i) => i !== idx));
  const updateEditItem = (idx: number, field: string, value: string) => {
    const copy = [...editItems];
    copy[idx][field] = value;
    if (field === "concreteTypeId" && value) {
      const ct = concreteTypes.find(c => String(c.id) === value);
      if (ct) copy[idx].pricePerM3 = String(ct.pricePerM3);
    }
    setEditItems(copy);
  };

  const addEditWorker = () => setEditWorkers([...editWorkers, { workerId: "", hours: "", rate: "" }]);
  const removeEditWorker = (idx: number) => setEditWorkers(editWorkers.filter((_, i) => i !== idx));
  const updateEditWorker = (idx: number, field: string, value: string) => {
    const copy = [...editWorkers];
    copy[idx][field] = value;
    if (field === "workerId" && value) {
      const w = workers.find(x => String(x.id) === value);
      if (w && (!copy[idx].rate || copy[idx].rate === "0")) copy[idx].rate = String(w.dailyRate || "");
    }
    setEditWorkers(copy);
  };

  const addEditMaterial = () => setEditMaterials([...editMaterials, { materialId: "", quantity: "" }]);
  const removeEditMaterial = (idx: number) => setEditMaterials(editMaterials.filter((_, i) => i !== idx));
  const updateEditMaterial = (idx: number, field: string, value: string) => {
    const copy = [...editMaterials];
    copy[idx][field] = value;
    setEditMaterials(copy);
  };

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/pourings/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        siteId: parseInt(form.siteId),
        machineId: form.machineId ? parseInt(form.machineId) : null,
        items: editItems.map(i => ({
          concreteTypeId: parseInt(i.concreteTypeId),
          quantityM3: parseFloat(i.quantityM3),
          pricePerM3: parseFloat(i.pricePerM3) || 0,
        })),
        workers: editWorkers.filter(w => w.workerId).map(w => ({
          workerId: parseInt(w.workerId),
          hours: parseFloat(w.hours) || 0,
          rate: parseFloat(w.rate) || 0,
        })),
        materials: editMaterials.filter(m => m.materialId).map(m => ({
          materialId: parseInt(m.materialId),
          quantity: parseFloat(m.quantity) || 0,
        })),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPoured(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  if (!poured) return <div className="p-6">Зареждане...</div>;

  const totalQty = (poured.items || []).reduce((s: number, i: any) => s + (i.quantityM3 || 0), 0);
  const totalPrice = (poured.items || []).reduce((s: number, i: any) => s + (i.total || i.quantityM3 * (i.pricePerM3 || i.concreteTypePrice || 0) || 0), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📋 Актуване</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/pourings/${poured.id}/pdf`} target="_blank" rel="noopener">
              <FileText className="h-4 w-4 mr-1" /> PDF
            </a>
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={() => setEditing(!editing)}>
              {editing ? "Отказ" : "✏️ Редакция"}
            </Button>
          )}
        </div>
      </div>

      {/* Main info */}
      <Card>
        <CardHeader><CardTitle>Основна информация</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Обект</Label>
              {editing ? (
                <Select value={form.siteId} onValueChange={(v) => setForm({ ...form, siteId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sites.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{poured.site?.name || "—"}</p>
              )}
            </div>
            <div>
              <Label>Дата</Label>
              {editing ? (
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              ) : (
                <p className="text-sm font-medium">{poured.date}</p>
              )}
            </div>
            <div>
              <Label>Оферта</Label>
              {poured.offer ? (
                <a href={`/offers/${poured.offer.id}`} className="text-sm font-medium text-primary hover:underline">
                  №{poured.offer.number}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Без оферта</p>
              )}
            </div>
            <div>
              <Label>Машина</Label>
              {editing ? (
                <Select value={form.machineId} onValueChange={(v) => setForm({ ...form, machineId: v })}>
                  <SelectTrigger><SelectValue placeholder="Без машина" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Без машина</SelectItem>
                    {machines.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{poured.machine?.name || "—"}</p>
              )}
            </div>
            <div>
              <Label>Време</Label>
              {editing ? (
                <Input value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} />
              ) : (
                <p className="text-sm">{poured.weather || "—"}</p>
              )}
            </div>
          </div>
          <div>
            <Label>Бележки</Label>
            {editing ? (
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            ) : (
              <p className="text-sm">{poured.notes || "—"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Редове на изливане</CardTitle>
          {editing && (
            <Button type="button" variant="outline" size="sm" onClick={addEditItem}>
              <Plus className="h-4 w-4 mr-1" /> Добави
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              {editItems.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Ред {idx + 1}</span>
                    {editItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeEditItem(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Тип бетон *</Label>
                      <Select value={item.concreteTypeId} onValueChange={(v) => updateEditItem(idx, "concreteTypeId", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Избери" /></SelectTrigger>
                        <SelectContent>
                          {concreteTypes.map((ct: any) => (
                            <SelectItem key={ct.id} value={String(ct.id)}>
                              {ct.name} — {ct.pricePerM3} €/m³
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">К-во (m³)</Label>
                      <Input type="number" step="0.5" min="0" className="h-8 text-sm" value={item.quantityM3}
                        onChange={e => updateEditItem(idx, "quantityM3", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Цена/m³</Label>
                      <Input type="number" step="0.01" min="0" className="h-8 text-sm" value={item.pricePerM3}
                        onChange={e => updateEditItem(idx, "pricePerM3", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {(!poured.items || poured.items.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">Няма редове</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Тип бетон</th>
                      <th className="pb-2 font-medium text-right">К-во (m³)</th>
                      <th className="pb-2 font-medium text-right">Цена/m³</th>
                      <th className="pb-2 font-medium text-right">Общо</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poured.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2">{item.concreteTypeName || `Тип #${item.concreteTypeId}`}</td>
                        <td className="py-2 text-right">{item.quantityM3}</td>
                        <td className="py-2 text-right">{item.pricePerM3 || item.concreteTypePrice || 0} €</td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(item.total || item.quantityM3 * (item.pricePerM3 || item.concreteTypePrice || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-bold">
                      <td colSpan={1} className="pt-3 text-muted-foreground">Общо</td>
                      <td className="pt-3 text-right">{totalQty.toFixed(1)} m³</td>
                      <td></td>
                      <td className="pt-3 text-right text-orange-600">{formatCurrency(totalPrice)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>👷 Работници</CardTitle>
          {editing && (
            <Button type="button" variant="outline" size="sm" onClick={addEditWorker}>
              <Plus className="h-4 w-4 mr-1" /> Добави
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              {editWorkers.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Няма работници</p>}
              {editWorkers.map((w, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Работник {idx + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeEditWorker(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Работник *</Label>
                      <Select value={w.workerId} onValueChange={(v) => updateEditWorker(idx, "workerId", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Избери" /></SelectTrigger>
                        <SelectContent>
                          {workers.map((x: any) => (
                            <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Часа</Label>
                      <Input type="number" step="0.5" min="0" className="h-8 text-sm" value={w.hours}
                        onChange={e => updateEditWorker(idx, "hours", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ставка (€/ч)</Label>
                      <Input type="number" step="0.01" min="0" className="h-8 text-sm" value={w.rate}
                        onChange={e => updateEditWorker(idx, "rate", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {(!poured.workers || poured.workers.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">Няма работници</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Работник</th>
                      <th className="pb-2 font-medium text-right">Часа</th>
                      <th className="pb-2 font-medium text-right">Ставка</th>
                      <th className="pb-2 font-medium text-right">Общо</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poured.workers.map((w: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2">{w.workerName || `#${w.workerId}`}</td>
                        <td className="py-2 text-right">{w.hours}</td>
                        <td className="py-2 text-right">{w.rate} €</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(w.total || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materials */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>📦 Материали</CardTitle>
          {editing && (
            <Button type="button" variant="outline" size="sm" onClick={addEditMaterial}>
              <Plus className="h-4 w-4 mr-1" /> Добави
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              {editMaterials.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Няма материали</p>}
              {editMaterials.map((m, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Материал {idx + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeEditMaterial(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Материал *</Label>
                      <Select value={m.materialId} onValueChange={(v) => updateEditMaterial(idx, "materialId", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Избери" /></SelectTrigger>
                        <SelectContent>
                          {materialsList.map((x: any) => (
                            <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Количество</Label>
                      <Input type="number" step="0.01" min="0" className="h-8 text-sm" value={m.quantity}
                        onChange={e => updateEditMaterial(idx, "quantity", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {(!poured.materials || poured.materials.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">Няма материали</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Материал</th>
                      <th className="pb-2 font-medium text-right">Количество</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poured.materials.map((m: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2">{m.materialName || `#${m.materialId}`}</td>
                        <td className="py-2 text-right">{m.quantity} {m.unit || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Записване..." : "💾 Запис"}
        </Button>
      )}

      {/* Offer vs Actual comparison */}
      {offerData && offerData.items && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Оферирано vs Актувано — Оферта №{offerData.number}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">Оферирано (m³)</TableHead>
                    <TableHead className="text-right">Актувано (m³)</TableHead>
                    <TableHead className="text-right">Разлика</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offerData.items.map((oi: any, idx: number) => {
                    const pouredItem = (poured.items || [])[idx];
                    const offered = oi.quantityM3 || 0;
                    const actual = pouredItem ? (pouredItem.quantityM3 || 0) : 0;
                    const diff = actual - offered;
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {oi.concreteTypeName || oi.serviceName || `Ред ${idx + 1}`}
                        </TableCell>
                        <TableCell className="text-right">{offered.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{actual.toFixed(1)}</TableCell>
                        <TableCell className={`text-right font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="p-3 text-xs text-muted-foreground border-t">
              🟢 Положителна = над оферираното &nbsp;|&nbsp; 🔴 Отрицателна = под оферираното
            </div>
          </CardContent>
        </Card>
      )}

      <PhotoGallery pouringId={params.id as string} />
    </div>
  );
}
