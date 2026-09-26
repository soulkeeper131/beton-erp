"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsAdmin } from "@/lib/use-is-admin";

export default function MaterialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const id = params?.id as string;

  const [material, setMaterial] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [type, setType] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [supplier, setSupplier] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ name: "", unit: "", pricePerUnit: "", minThreshold: "", notes: "" });

  const load = useCallback(async () => {
    if (!id) return;
    const [m, d] = await Promise.all([
      fetch(`/api/materials/${id}`).then((r) => r.json()),
      fetch(`/api/materials/${id}/deliveries`).then((r) => r.json()),
    ]);
    setMaterial(m);
    setEdit({
      name: m.name || "", unit: m.unit || "",
      pricePerUnit: m.pricePerUnit != null ? String(m.pricePerUnit) : "",
      minThreshold: String(m.minThreshold ?? 0), notes: m.notes || "",
    });
    setDeliveries(Array.isArray(d) ? d : []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    const q = parseFloat(quantity);
    if (!q || q <= 0) return alert("Въведи количество");
    setSaving(true);
    const res = await fetch(`/api/materials/${id}/deliveries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: type === "in" ? q : -q,
        date,
        supplier: supplier || null,
        price: price ? parseFloat(price) : null,
        notes: notes || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert(err.error || "Грешка");
    }
    setQuantity("");
    setSupplier("");
    setPrice("");
    setNotes("");
    load();
  }

  async function saveEdit() {
    setSaving(true);
    const res = await fetch(`/api/materials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: edit.name,
        unit: edit.unit,
        pricePerUnit: edit.pricePerUnit === "" ? null : edit.pricePerUnit,
        minThreshold: edit.minThreshold || 0,
        notes: edit.notes || null,
      }),
    });
    setSaving(false);
    if (!res.ok) return alert((await res.json().catch(() => null))?.error || "Грешка");
    setEditing(false);
    load();
  }

  async function handleDelete(deliveryId: number) {
    if (!confirm("Сигурен ли си? Наличността ще се коригира обратно.")) return;
    await fetch(`/api/materials/${id}/deliveries?deliveryId=${deliveryId}`, { method: "DELETE" });
    load();
  }

  if (loading) return <div className="p-6 text-muted-foreground">Зареждане...</div>;

  // Движения и изписано по актове — в една история, най-новите първи
  const history: any[] = [
    ...deliveries.map((d) => ({ ...d, act: false })),
    ...((material?.usage || []) as any[]).map((u) => ({ ...u, act: true })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (!material) return <div className="p-6 text-muted-foreground">Материалът не е намерен.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/materials")}>← Назад</Button>
          <h1 className="text-2xl font-bold">📦 {material.name}</h1>
          <p className="text-muted-foreground text-sm">
            Наличност: <span className="font-semibold">{material.quantity} {material.unit}</span>
            {" · "}Мин. праг: {material.minThreshold} {material.unit}
            {" · "}Цена: {material.pricePerUnit != null ? `${material.pricePerUnit} €/${material.unit}` : "—"}
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>{editing ? "Отказ" : "✏️ Редакция"}</Button>
        )}
      </div>

      {editing && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div><Label className="text-xs">Име *</Label><Input className="h-9" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div><Label className="text-xs">Мерна единица *</Label><Input className="h-9" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></div>
              <div><Label className="text-xs">Цена (€/{edit.unit || "ед."})</Label><Input type="number" step="0.01" min="0" className="h-9" value={edit.pricePerUnit} onChange={(e) => setEdit({ ...edit, pricePerUnit: e.target.value })} /></div>
              <div><Label className="text-xs">Мин. праг ({edit.unit || "ед."})</Label><Input type="number" step="0.01" min="0" className="h-9" value={edit.minThreshold} onChange={(e) => setEdit({ ...edit, minThreshold: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Бележки</Label><Input className="h-9" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Наличността се променя само с приход/разход или чрез актовете.</p>
            <Button onClick={saveEdit} disabled={saving}>💾 Запази</Button>
          </CardContent>
        </Card>
      )}

      {/* Add приход/разход */}
      {isAdmin && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Button variant={type === "in" ? "default" : "outline"} size="sm" onClick={() => setType("in")}>➕ Приход</Button>
              <Button variant={type === "out" ? "default" : "outline"} size="sm" onClick={() => setType("out")}>➖ Разход</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Количество ({material.unit}) *</Label>
                <Input type="number" step="0.01" min="0" className="h-9" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Дата *</Label>
                <Input type="date" className="h-9" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              {type === "in" && (
                <div>
                  <Label className="text-xs">Доставчик</Label>
                  <Input className="h-9" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
                </div>
              )}
              <div>
                <Label className="text-xs">{type === "in" ? `Ед. цена (€/${material.unit})` : "Цена (€)"}</Label>
                <Input type="number" step="0.01" min="0" className="h-9" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Забележка</Label>
              <Input className="h-9" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {type === "in" && <p className="text-xs text-muted-foreground">При приход с цена тя става текуща цена на материала (по нея се смятат разходите в актовете).</p>}
            <Button onClick={handleAdd} disabled={saving}>{saving ? "Запис..." : "Запиши"}</Button>
          </CardContent>
        </Card>
      )}

      {/* История */}
      <Card>
        <CardContent className="p-0">
          <div className="p-3 font-semibold text-sm border-b">История на движенията</div>
          {history.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Няма движения</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">К-во</TableHead>
                    <TableHead>Доставчик</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                    <TableHead>Забележка</TableHead>
                    {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((d) => d.act ? (
                    <TableRow key={`act-${d.pouringId}`}>
                      <TableCell className="whitespace-nowrap">{d.date}</TableCell>
                      <TableCell><span className="text-red-600">Акт</span></TableCell>
                      <TableCell className="text-right font-medium">-{d.quantity}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell>
                        <a className="underline" href={`/pourings/${d.pouringId}`}>Акт #{d.pouringId}{d.siteName ? ` · ${d.siteName}` : ""}</a>
                      </TableCell>
                      {isAdmin && <TableCell></TableCell>}
                    </TableRow>
                  ) : (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap">{d.date}</TableCell>
                      <TableCell>
                        {d.quantity > 0
                          ? <span className="text-green-600">Приход</span>
                          : <span className="text-red-600">Разход</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium">{d.quantity > 0 ? "+" : ""}{d.quantity}</TableCell>
                      <TableCell>{d.supplier || "—"}</TableCell>
                      <TableCell className="text-right">{d.price ? `${d.price} €/${material.unit}` : "—"}</TableCell>
                      <TableCell>{d.notes || "—"}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(d.id)}>🗑️</Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
