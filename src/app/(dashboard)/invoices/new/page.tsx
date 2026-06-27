"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, ArrowLeft, Search, CheckCircle } from "lucide-react";

const isValidEik = (v: string) => /^\d{9}$/.test(v) || /^\d{13}$/.test(v);

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [company, setCompany] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: "", supplierId: "", number: "",
    date: new Date().toISOString().split("T")[0],
    dueDate: "", taxEventDate: new Date().toISOString().split("T")[0],
    direction: "outgoing" as "incoming" | "outgoing",
    type: "invoice", currency: "EUR",
    discountPercent: 0, discountAmount: 0,
    paymentMethod: "bank", paymentStatus: "unpaid",
    taxExemptionReason: "", notes: "",
  });
  const [items, setItems] = useState([{ description: "", unit: "бр.", quantity: 1, price: 0, vatRate: 20 }]);
  const [eikSearch, setEikSearch] = useState("");
  const [eikLoading, setEikLoading] = useState(false);
  const [eikFound, setEikFound] = useState(false);
  const lastEikSearched = useRef("");

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then(setClients);
    fetch("/api/company-settings").then(r => r.json()).then(setCompany);
  }, []);

  // Auto-trigger when EIK reaches exactly 9 or 13 digits
  useEffect(() => {
    if (!isValidEik(eikSearch) || eikSearch === lastEikSearched.current || eikLoading) return;
    lastEikSearched.current = eikSearch;
    handleEikSearch();
  }, [eikSearch]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const vatAmount = items.reduce((s, i) => s + (i.quantity * i.price * i.vatRate) / 100, 0);
  const afterDiscount = subtotal - (subtotal * form.discountPercent / 100) - form.discountAmount;
  const total = afterDiscount + vatAmount;

  const addItem = () => setItems([...items, { description: "", unit: "бр.", quantity: 1, price: 0, vatRate: 20 }]);

  async function handleEikSearch() {
    if (!isValidEik(eikSearch)) return;
    setEikLoading(true);
    try {
      // First check if client with this EIK already exists
      const existing = clients.find(c => c.eik === eikSearch);
      if (existing) { setForm({...form, clientId: String(existing.id)}); setEikFound(true); setEikLoading(false); return; }
      // Search CompanyBook
      const res = await fetch(`/api/companybook?eik=${eikSearch}`);
      const data = await res.json();
      if (data.error) { alert(data.error); setEikLoading(false); return; }
      // Create new client
      const createRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.nameLatin || data.name,
          companyName: data.name,
          eik: data.eik,
          address: data.address,
        }),
      });
      if (createRes.ok) {
        const newClient = await createRes.json();
        setClients([...clients, newClient]);
        setForm({...form, clientId: String(newClient.id)});
        setEikFound(true);
      }
    } catch { alert("Грешка при търсене"); }
    setEikLoading(false);
  }
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, f: string, v: any) => {
    const copy = [...items];
    (copy[i] as any)[f] = v;
    setItems(copy);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.number || !form.dueDate || items.length === 0) return;
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, items }),
    });
    if (res.ok) router.push("/invoices");
    else { alert("Грешка"); setSaving(false); }
  }

  const isOutgoing = form.direction === "outgoing";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">🧾 Нова фактура</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Основна информация</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={isOutgoing ? "default" : "outline"} onClick={() => setForm({...form, direction: "outgoing"})}>📤 Изходяща</Button>
              <Button type="button" size="sm" variant={!isOutgoing ? "default" : "outline"} onClick={() => setForm({...form, direction: "incoming"})}>📥 Входяща</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Тип</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Фактура</SelectItem>
                    <SelectItem value="proforma">Проформа</SelectItem>
                    <SelectItem value="credit_note">Кредитно известие</SelectItem>
                    <SelectItem value="debit_note">Дебитно известие</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Номер *</Label><Input value={form.number} onChange={e => setForm({...form, number: e.target.value})} /></div>
              <div className="space-y-2"><Label>Валута</Label><Input value={form.currency} disabled /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Дата *</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
              <div className="space-y-2"><Label>Падеж *</Label><Input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} /></div>
              <div className="space-y-2"><Label>Данъчно събитие *</Label><Input type="date" value={form.taxEventDate} onChange={e => setForm({...form, taxEventDate: e.target.value})} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{isOutgoing ? "Получател" : "Доставчик"}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Клиент *</Label>
              <Select value={form.clientId} onValueChange={v => setForm({...form, clientId: v})}>
                <SelectTrigger><SelectValue placeholder="Изберете клиент" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.companyName ? `${c.companyName} (${c.name})` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 items-end mt-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Бързо добавяне по ЕИК</Label>
                <div className="relative">
                  <Input className={`h-8 text-sm ${eikFound ? "pr-8 border-green-500" : ""}`} placeholder="9 или 13 цифри" value={eikSearch} onChange={e => { setEikSearch(e.target.value); setEikFound(false); }} />
                  {eikLoading && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">...</span>}
                  {eikFound && <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={handleEikSearch} disabled={eikLoading || !isValidEik(eikSearch)}>
                <Search className="h-3 w-3" /> {eikLoading ? "..." : "Търси"}
              </Button>
            </div>
            {form.clientId && (() => {
              const c = clients.find(x => String(x.id) === form.clientId);
              if (!c) return null;
              return (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {c.companyName && <div>Фирма: {c.companyName}</div>}
                  {c.eik && <div>ЕИК: {c.eik}</div>}
                  {c.vatNumber && <div>ДДС №: {c.vatNumber}</div>}
                  {c.address && <div>Адрес: {c.address}</div>}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {isOutgoing && company.companyName && (
          <Card>
            <CardHeader><CardTitle>Доставчик</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>Фирма: {company.companyName}</div>
                {company.companyNameBG && <div>{company.companyNameBG}</div>}
                {company.eik && <div>ЕИК: {company.eik}</div>}
                {company.vatNumber && <div>ДДС №: {company.vatNumber}</div>}
                {company.city && <div>Град: {company.city}</div>}
                {company.address && <div>Адрес: {company.address}</div>}
                {company.mol && <div>МОЛ: {company.mol}</div>}
                {company.bankName && <div>Банка: {company.bankName}</div>}
                {company.iban && <div>IBAN: {company.iban}</div>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Редове</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Добави</Button>
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Описание *</Label>
                    <Input className="h-8 text-sm" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">К-во</Label>
                    <Input type="number" className="h-8 text-sm" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Цена</Label>
                    <Input type="number" step="0.01" className="h-8 text-sm" value={item.price} onChange={e => updateItem(idx, "price", parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Мярка: </span>
                  <Select value={item.unit} onValueChange={v => updateItem(idx, "unit", v)}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="бр.">бр.</SelectItem><SelectItem value="m³">m³</SelectItem>
                      <SelectItem value="m²">m²</SelectItem><SelectItem value="m">m</SelectItem>
                      <SelectItem value="кг">кг</SelectItem><SelectItem value="тон">тон</SelectItem>
                      <SelectItem value="час">час</SelectItem><SelectItem value="ден">ден</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>ДДС: </span>
                  <Select value={String(item.vatRate)} onValueChange={v => updateItem(idx, "vatRate", parseInt(v))}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20%</SelectItem>
                      <SelectItem value="9">9%</SelectItem>
                      <SelectItem value="0">0%</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="ml-auto font-semibold">{formatCurrency(item.quantity * item.price)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Отстъпка %</Label><Input type="number" value={form.discountPercent} onChange={e => setForm({...form, discountPercent: parseFloat(e.target.value) || 0})} /></div>
              <div className="space-y-2"><Label>Отстъпка сума</Label><Input type="number" value={form.discountAmount} onChange={e => setForm({...form, discountAmount: parseFloat(e.target.value) || 0})} /></div>
              <div className="space-y-2"><Label>Начин на плащане</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm({...form, paymentMethod: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Банков превод</SelectItem>
                    <SelectItem value="cash">В брой</SelectItem>
                    <SelectItem value="card">Карта</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Основание за нулева ставка</Label><Input value={form.taxExemptionReason} onChange={e => setForm({...form, taxExemptionReason: e.target.value})} /></div>
            <div className="space-y-2"><Label>Бележки</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>

            <div className="border-t pt-3 space-y-1 text-right">
              <div className="text-sm text-muted-foreground">Сума без ДДС: {formatCurrency(subtotal)}</div>
              {form.discountPercent > 0 && <div className="text-sm text-muted-foreground">Отстъпка {form.discountPercent}%: -{formatCurrency(subtotal * form.discountPercent / 100)}</div>}
              {form.discountAmount > 0 && <div className="text-sm text-muted-foreground">Отстъпка: -{formatCurrency(form.discountAmount)}</div>}
              <div className="text-sm text-muted-foreground">ДДС: {formatCurrency(vatAmount)}</div>
              <div className="text-xl font-bold">Общо: {formatCurrency(total)} {form.currency}</div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="submit" disabled={saving} className="gap-2 w-full sm:w-auto">💾 {saving ? "Запазване..." : "Запази фактура"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">Отказ</Button>
        </div>
      </form>
    </div>
  );
}
