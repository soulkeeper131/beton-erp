"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { today } from "@/lib/dates";

// useSearchParams изисква Suspense граница
export default function NewPouringPage() {
  return <Suspense><NewPouringForm /></Suspense>;
}

function NewPouringForm() {
  const router = useRouter();
  // Преди се четеше window.location — при навигация от офертата/обекта (без презареждане)
  // адресът още беше старият и обектът/офертата не се попълваха
  const query = useSearchParams();
  const preselectedSiteId = query?.get("siteId") || "";
  // ?offerId= — „Нов акт по офертата“: обектът и редовете идват от офертата
  const preselectedOfferId = query?.get("offerId") || "";
  const [sites, setSites] = useState<any[]>([]);
  const [concreteTypes, setConcreteTypes] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Договорени цени от избраната оферта: concreteTypeId → цена/m³
  const [offerItems, setOfferItems] = useState<any[]>([]);

  const [form, setForm] = useState({
    siteId: preselectedSiteId,
    offerId: "",
    date: today(),
    machineId: "",
    weather: "",
    notes: "",
  });

  const [items, setItems] = useState([{ concreteTypeId: "", quantityM3: "", pricePerM3: "" }]);

  useEffect(() => {
    fetch("/api/sites").then(r => r.json()).then(setSites);
    fetch("/api/concrete-types").then(r => r.json()).then(setConcreteTypes);
    fetch("/api/machines").then(r => r.json()).then(setMachines);
    fetch("/api/offers").then(r => r.json()).then(setOffers);
    if (preselectedOfferId) selectOffer(preselectedOfferId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Оферти за избрания обект — или без обект, но за същия клиент
  const selectedSite = sites.find(s => String(s.id) === form.siteId);
  const filteredOffers = form.siteId
    ? offers.filter(o => (o.siteId === parseInt(form.siteId) || (!o.siteId && selectedSite && o.clientId === selectedSite.clientId))
        && (o.status === "sent" || o.status === "accepted" || String(o.id) === form.offerId))
    : [];

  const offerPrice = (concreteTypeId: string) =>
    offerItems.find(oi => String(oi.concreteTypeId) === concreteTypeId)?.pricePerM3;

  // При избор на оферта редовете се попълват от нея (тип бетон + договорена цена)
  async function selectOffer(offerId: string) {
    setForm(f => ({ ...f, offerId }));
    if (!offerId) { setOfferItems([]); return; }
    const offer = await fetch(`/api/offers/${offerId}`).then(r => r.json()).catch(() => null);
    if (offer?.siteId) setForm(f => ({ ...f, siteId: f.siteId || String(offer.siteId) }));
    const concrete = (offer?.items || []).filter((oi: any) => oi.concreteTypeId);
    setOfferItems(concrete);
    const emptyRows = items.every(i => !i.concreteTypeId && !i.quantityM3);
    if (concrete.length && emptyRows) {
      setItems(concrete.map((oi: any) => ({ concreteTypeId: String(oi.concreteTypeId), quantityM3: "", pricePerM3: String(oi.pricePerM3) })));
    }
  }

  const addItem = () => setItems([...items, { concreteTypeId: "", quantityM3: "", pricePerM3: "" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: string, value: string) => {
    const copy = [...items];
    (copy[idx] as any)[field] = value;

    // Auto-fill price when concrete type changes
    if (field === "concreteTypeId" && value) {
      const ct = concreteTypes.find(c => String(c.id) === value);
      const contract = offerPrice(value);
      if (contract != null) copy[idx].pricePerM3 = String(contract);
      else if (ct) copy[idx].pricePerM3 = String(ct.pricePerM3);
    }

    setItems(copy);
  };

  const totalQty = items.reduce((s, i) => s + (parseFloat(i.quantityM3) || 0), 0);
  const totalPrice = items.reduce((s, i) => {
    const qty = parseFloat(i.quantityM3) || 0;
    const price = parseFloat(i.pricePerM3) || 0;
    return s + qty * price;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.siteId) { setError("Изберете обект"); return; }
    const bad = items.findIndex(i => !i.concreteTypeId || !(parseFloat(i.quantityM3) > 0));
    if (bad >= 0) { setError(`Ред ${bad + 1}: изберете тип бетон и въведете количество`); return; }
    setError("");
    setSaving(true);

    const res = await fetch("/api/pourings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        siteId: parseInt(form.siteId),
        offerId: form.offerId ? parseInt(form.offerId) : null,
        machineId: form.machineId ? parseInt(form.machineId) : null,
        items: items.map(i => ({
          concreteTypeId: parseInt(i.concreteTypeId),
          quantityM3: parseFloat(i.quantityM3),
          pricePerM3: parseFloat(i.pricePerM3) || (
            concreteTypes.find(c => String(c.id) === i.concreteTypeId)?.pricePerM3 || 0
          ),
        })),
      }),
    });

    if (res.ok) {
      // Към акта — там се добавят работници, материали и снимки
      const created = await res.json();
      router.push(`/pourings/${created.id}`);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Грешка при запис");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">📋 Ново актуване</h1>

      <Card>
        <CardHeader><CardTitle>Основна информация</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Обект *</Label>
                <Select value={form.siteId} onValueChange={(v) => {
                  // Radix вика onValueChange и когато списъкът се зареди след избраната стойност —
                  // без тази проверка предварително избраната оферта се изтриваше
                  if (v === form.siteId) return;
                  setForm({ ...form, siteId: v, offerId: "" }); setOfferItems([]);
                }}>
                  <SelectTrigger><SelectValue placeholder="Избери обект" /></SelectTrigger>
                  <SelectContent>
                    {sites.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Дата *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Оферта</Label>
                <Select value={form.offerId} onValueChange={selectOffer} disabled={!form.siteId}>
                  <SelectTrigger><SelectValue placeholder={form.siteId ? "Избери оферта (опционално)" : "Първо избери обект"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Без оферта</SelectItem>
                    {filteredOffers.map((o: any) => (
                      <SelectItem key={o.id} value={String(o.id)}>№{o.number} ({o.date})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Машина</Label>
                <Select value={form.machineId} onValueChange={(v) => setForm({ ...form, machineId: v })}>
                  <SelectTrigger><SelectValue placeholder="Без машина" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Без машина</SelectItem>
                    {machines.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Време</Label>
                <Input value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} placeholder="Слънчево..." />
              </div>
            </div>
            <div>
              <Label>Бележки</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Редове на изливане</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Добави ред
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Ред {idx + 1}</span>
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3 md:col-span-1 space-y-1">
                  <Label className="text-xs">Тип бетон *</Label>
                  <Select value={item.concreteTypeId} onValueChange={(v) => updateItem(idx, "concreteTypeId", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Избери" /></SelectTrigger>
                    <SelectContent>
                      {concreteTypes.map((ct: any) => (
                        <SelectItem key={ct.id} value={String(ct.id)}>
                          {ct.name} — {offerPrice(String(ct.id)) ?? ct.pricePerM3} €/m³{offerPrice(String(ct.id)) != null ? " (по оферта)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">К-во (m³) *</Label>
                  <Input type="number" step="0.5" min="0" className="h-8 text-sm" value={item.quantityM3}
                    onChange={e => updateItem(idx, "quantityM3", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Цена/m³</Label>
                  <Input type="number" step="0.01" min="0" className="h-8 text-sm" value={item.pricePerM3}
                    onChange={e => updateItem(idx, "pricePerM3", e.target.value)} />
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                Общо: {formatCurrency((parseFloat(item.quantityM3) || 0) * (parseFloat(item.pricePerM3) || 0))}
              </div>
            </div>
          ))}

          {/* Totals */}
          <div className="border-t pt-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Общо количество:</span>
            <span className="font-bold">{totalQty.toFixed(1)} m³</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Обща стойност:</span>
            <span className="font-bold text-orange-600">{formatCurrency(totalPrice)}</span>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving} onClick={handleSubmit}>
          {saving ? "Записване..." : "💾 Запис"}
        </Button>
        <Button variant="outline" type="button" onClick={() => router.back()}>Отказ</Button>
      </div>
    </div>
  );
}
