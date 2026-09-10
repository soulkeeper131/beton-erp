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

  const load = useCallback(async () => {
    if (!id) return;
    const [m, d] = await Promise.all([
      fetch(`/api/materials/${id}`).then((r) => r.json()),
      fetch(`/api/materials/${id}/deliveries`).then((r) => r.json()),
    ]);
    setMaterial(m);
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

  async function handleDelete(deliveryId: number) {
    if (!confirm("Сигурен ли си? Наличността ще се коригира обратно.")) return;
    await fetch(`/api/materials/${id}/deliveries?deliveryId=${deliveryId}`, { method: "DELETE" });
    load();
  }

  if (loading) return <div className="p-6 text-muted-foreground">Зареждане...</div>;
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
          </p>
        </div>
      </div>

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
                <Label className="text-xs">Цена (€)</Label>
                <Input type="number" step="0.01" min="0" className="h-9" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Забележка</Label>
              <Input className="h-9" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button onClick={handleAdd} disabled={saving}>{saving ? "Запис..." : "Запиши"}</Button>
          </CardContent>
        </Card>
      )}

      {/* История */}
      <Card>
        <CardContent className="p-0">
          <div className="p-3 font-semibold text-sm border-b">История на движенията</div>
          {deliveries.length === 0 ? (
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
                  {deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap">{d.date}</TableCell>
                      <TableCell>
                        {d.quantity > 0
                          ? <span className="text-green-600">Приход</span>
                          : <span className="text-red-600">Разход</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium">{d.quantity > 0 ? "+" : ""}{d.quantity}</TableCell>
                      <TableCell>{d.supplier || "—"}</TableCell>
                      <TableCell className="text-right">{d.price ? `${d.price} €` : "—"}</TableCell>
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
