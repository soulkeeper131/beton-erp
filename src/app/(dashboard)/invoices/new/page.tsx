"use client";
import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { calcInvoiceTotals } from "@/lib/calc";
import { Plus, Trash2, ArrowLeft, Search, CheckCircle } from "lucide-react";
import { today, addDays } from "@/lib/dates";
import { actInvoiceLines } from "@/lib/invoices";

const DUE_DAYS = 14; // падеж по подразбиране

const isValidEik = (v: string) => /^\d{9}$/.test(v) || /^\d{13}$/.test(v);

// useSearchParams изисква Suspense граница
export default function NewInvoicePage() {
  return <Suspense><InvoiceForm /></Suspense>;
}

function InvoiceForm() {
  const router = useRouter();
  const search = useSearchParams();
  // ?edit=ID — редакция на чернова; ?pourings=1,2 — фактура от актове;
  // ?type=credit_note&related=ID — известие към фактура
  const editId = search.get("edit");
  const [pouringIds, setPouringIds] = useState<number[]>([]);
  const [acts, setActs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [nextNumber, setNextNumber] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [company, setCompany] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: "", supplierId: "", number: "",
    date: today(),
    dueDate: addDays(today(), DUE_DAYS), taxEventDate: today(),
    direction: "outgoing" as "incoming" | "outgoing",
    type: "invoice", currency: "EUR",
    discountPercent: 0, discountAmount: 0,
    paymentMethod: "bank", paymentStatus: "unpaid",
    taxExemptionReason: "", notes: "", relatedInvoiceId: "",
  });
  const [issuedInvoices, setIssuedInvoices] = useState<any[]>([]);
  const [items, setItems] = useState([{ description: "", unit: "бр.", quantity: 1, price: 0, vatRate: 20 }]);
  const [eikSearch, setEikSearch] = useState("");
  const [eikLoading, setEikLoading] = useState(false);
  const [eikFound, setEikFound] = useState(false);
  const lastEikSearched = useRef("");
  const eikTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then(setClients);
    fetch("/api/company-settings").then(r => r.json()).then(setCompany);
    fetch("/api/invoices?status=sent").then(r => r.json()).then(d => Array.isArray(d) && setIssuedInvoices(d)).catch(() => {});

    const pourings = search.get("pourings");
    const related = search.get("related");
    if (editId) {
      // Редакция на чернова
      fetch(`/api/invoices/${editId}`).then(r => r.json()).then(d => {
        if (d.error) { setError(d.error); return; }
        if (d.status !== "draft") { router.replace(`/invoices/${editId}`); return; }
        setForm(f => ({
          ...f,
          clientId: String(d.clientId), number: d.direction === "incoming" ? d.number : "",
          date: d.date, dueDate: d.dueDate, taxEventDate: d.taxEventDate || d.date,
          direction: d.direction, type: d.type, currency: d.currency || "EUR",
          discountPercent: d.discountPercent || 0, discountAmount: d.discountAmount || 0,
          paymentMethod: d.paymentMethod || "bank", paymentStatus: d.paymentStatus || "unpaid",
          taxExemptionReason: d.taxExemptionReason || "", notes: d.notes || "",
          relatedInvoiceId: d.relatedInvoiceId ? String(d.relatedInvoiceId) : "",
        }));
        setItems((d.items || []).map((i: any) => ({ description: i.description, unit: i.unit, quantity: i.quantity, price: i.price, vatRate: i.vatRate })));
        setActs(d.acts || []);
        setPouringIds((d.acts || []).map((a: any) => a.id));
        fetchNextNumber(d.direction, d.type);
      });
      return;
    }
    if (pourings) {
      // Фактура от актове: клиентът и редовете идват от тях
      fetch(`/api/pourings?ids=${encodeURIComponent(pourings)}`).then(r => r.json()).then((list: any[]) => {
        if (!Array.isArray(list) || !list.length) { setError("Актовете не са намерени"); return; }
        const billed = list.filter(a => a.invoiceId);
        if (billed.length) setError(`Вече фактурирани: ${billed.map(a => `акт №${a.id} (${a.invoice?.number || "фактура"})`).join(", ")} — махнати са.`);
        const free = list.filter(a => !a.invoiceId);
        const clientIds = new Set(free.map(a => a.clientId));
        if (clientIds.size > 1) { setError("Избраните актове са на различни клиенти — фактурирайте ги поотделно."); return; }
        if (!free.length) return;
        setActs(free.map(a => ({ id: a.id, date: a.date, siteName: a.site?.name, quantityM3: a.quantityM3 })));
        setPouringIds(free.map(a => a.id));
        setForm(f => ({ ...f, clientId: String(free[0].clientId), type: "invoice", direction: "outgoing" }));
        setItems(actInvoiceLines(free.map(a => ({ id: a.id, date: a.date, siteName: a.site?.name, items: a.items || [] }))));
      });
    } else if (related) {
      // Известие към издадена фактура — клиентът и редовете се копират за корекция
      const type = search.get("type") === "debit_note" ? "debit_note" : "credit_note";
      fetch(`/api/invoices/${related}`).then(r => r.json()).then(d => {
        if (d.error) return;
        setForm(f => ({ ...f, type, direction: d.direction, clientId: String(d.clientId), relatedInvoiceId: String(d.id), taxExemptionReason: d.taxExemptionReason || "" }));
        setItems((d.items || []).map((i: any) => ({ description: i.description, unit: i.unit, quantity: i.quantity, price: i.price, vatRate: i.vatRate })));
        fetchNextNumber(d.direction, type);
      });
      return;
    }
    fetchNextNumber("outgoing", "invoice");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Изходящите получават номер при издаване — показва се кой ще бъде; входящите се въвеждат
  const fetchNextNumber = async (dir: string, type: string) => {
    try {
      const res = await fetch(`/api/invoices/next-number?direction=${dir}&type=${type}`);
      const data = await res.json();
      if (!data.number) return;
      if (dir === "incoming") setForm(prev => ({ ...prev, number: prev.number || data.number }));
      else setNextNumber(data.number);
    } catch {}
  };

  // Debounced auto-trigger: wait 600ms after last keystroke
  const handleEikChange = (v: string) => {
    setEikSearch(v);
    setEikFound(false);
    if (eikTimeout.current) clearTimeout(eikTimeout.current);
    if (isValidEik(v) && v !== lastEikSearched.current) {
      eikTimeout.current = setTimeout(() => {
        lastEikSearched.current = v;
        handleEikSearch(v);
      }, 600);
    }
  };

  // Същото изчисление като в сървъра — ДДС върху основата след отстъпка
  const { subtotal, vatAmount, total } = calcInvoiceTotals(items, form.discountPercent, form.discountAmount);
  const isNote = form.type === "credit_note" || form.type === "debit_note";

  const addItem = () => setItems([...items, { description: "", unit: "бр.", quantity: 1, price: 0, vatRate: 20 }]);

  async function handleEikSearch(eik?: string) {
    const searchEik = eik || eikSearch;
    if (!isValidEik(searchEik)) return;
    setEikLoading(true);
    try {
      // First check if client with this EIK already exists
      const existing = clients.find(c => c.eik === searchEik);
      if (existing) { setForm({...form, clientId: String(existing.id)}); setEikFound(true); setEikLoading(false); return; }
      // Search CompanyBook
      const res = await fetch(`/api/companybook?eik=${searchEik}`);
      const data = await res.json();
      if (data.error) { alert(data.error); setEikLoading(false); return; }
      if (data.active === false && !confirm(`Фирмата е със статус „${data.status}“ в Търговския регистър. Да я добавя ли като клиент?`)) {
        setEikLoading(false); return;
      }
      // Create new client
      const createRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.nameLatin || data.name,
          companyName: data.name,
          eik: data.eik,
          address: data.address,
          vatNumber: data.vatNumber || "",
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

  async function save(issue: boolean) {
    setError("");
    if (!form.clientId) return setError("Изберете клиент");
    if (!isOutgoing && !form.number.trim()) return setError("Въведете номера на входящата фактура");
    if (isNote && !form.relatedInvoiceId) return setError("Изберете фактурата, към която е известието");
    const bad = items.findIndex(i => !i.description.trim() || !(i.quantity > 0));
    if (bad >= 0) return setError(`Ред ${bad + 1}: въведете описание и количество`);
    setSaving(true);
    const res = await fetch(editId ? `/api/invoices/${editId}` : "/api/invoices", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        number: isOutgoing ? null : form.number,
        relatedInvoiceId: isNote ? form.relatedInvoiceId || null : null,
        items,
        pouringIds,
        issue: !editId && issue,
      }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok || data?.id) {
      const id = editId || data.id;
      // Редакция + „Издай“: издаването е отделна стъпка (номерът се дава тогава)
      if (editId && issue) {
        const r = await fetch(`/api/invoices/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "sent" }) });
        if (!r.ok) {
          setError(`Черновата е записана, но не е издадена: ${(await r.json().catch(() => null))?.error || "грешка"}`);
          setSaving(false);
          return;
        }
      } else if (!res.ok) {
        alert(data.error);
      }
      router.push(`/invoices/${id}`);
      return;
    }
    setError(typeof data?.error === "string" ? data.error : "Грешка при запазване — проверете полетата");
    setSaving(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    save(false);
  }

  const isOutgoing = form.direction === "outgoing";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">🧾 {editId ? "Редакция на чернова" : isNote ? (form.type === "credit_note" ? "Кредитно известие" : "Дебитно известие") : "Нова фактура"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Основна информация</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={!!editId || pouringIds.length > 0} variant={isOutgoing ? "default" : "outline"} onClick={() => { setForm({...form, direction: "outgoing", number: ""}); fetchNextNumber("outgoing", form.type); }}>📤 Изходяща</Button>
              <Button type="button" size="sm" disabled={!!editId || pouringIds.length > 0} variant={!isOutgoing ? "default" : "outline"} onClick={() => { setForm({...form, direction: "incoming"}); fetchNextNumber("incoming", form.type); }}>📥 Входяща</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Тип</Label>
                <Select value={form.type} onValueChange={v => { setForm({...form, type: v}); if (isOutgoing) fetchNextNumber("outgoing", v); }} disabled={pouringIds.length > 0}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Фактура</SelectItem>
                    <SelectItem value="proforma">Проформа</SelectItem>
                    <SelectItem value="credit_note">Кредитно известие</SelectItem>
                    <SelectItem value="debit_note">Дебитно известие</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isOutgoing ? (
                <div className="space-y-2"><Label>Номер</Label>
                  <div className="h-10 flex items-center text-sm text-muted-foreground" data-testid="number-preview">
                    при издаване{nextNumber ? ` → ${nextNumber}` : ""}
                  </div>
                </div>
              ) : (
                <div className="space-y-2"><Label>Номер *</Label><Input value={form.number} onChange={e => setForm({...form, number: e.target.value})} /></div>
              )}
              <div className="space-y-2"><Label>Валута</Label><Input value={form.currency} disabled /></div>
            </div>
            {isNote && (
              <div className="space-y-2">
                <Label>Към фактура *</Label>
                <Select value={form.relatedInvoiceId} onValueChange={v => setForm({...form, relatedInvoiceId: v})}>
                  <SelectTrigger><SelectValue placeholder="Изберете фактурата, която се коригира" /></SelectTrigger>
                  <SelectContent>
                    {issuedInvoices.filter(i => i.direction === form.direction && i.type === "invoice" && (!form.clientId || String(i.clientId) === form.clientId)).map(i => (
                      <SelectItem key={i.id} value={String(i.id)}>
                        {i.number} · {i.date} · {i.clientCompany || i.clientName} · {formatCurrency(i.total)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Дата *</Label><Input type="date" value={form.date} onChange={e => { const date = e.target.value; setForm(f => ({ ...f, date, taxEventDate: f.taxEventDate === f.date ? date : f.taxEventDate, dueDate: f.dueDate < date ? addDays(date, DUE_DAYS) : f.dueDate })); }} /></div>
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
              <Select value={form.clientId} onValueChange={v => setForm({...form, clientId: v})} disabled={pouringIds.length > 0}>
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
                  <Input className={`h-8 text-sm ${eikFound ? "pr-8 border-green-500" : ""}`} placeholder="9 или 13 цифри" value={eikSearch} onChange={e => handleEikChange(e.target.value)} />
                  {eikLoading && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">...</span>}
                  {eikFound && <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />}
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => handleEikSearch()} disabled={eikLoading || !isValidEik(eikSearch)}>
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

        {acts.length > 0 && (
          <Card>
            <CardHeader><CardTitle>📋 Фактурирани актове</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {acts.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <a href={`/pourings/${a.id}`} target="_blank" className="underline">Акт №{a.id} от {a.date}{a.siteName ? ` — ${a.siteName}` : ""}</a>
                  <span className="text-muted-foreground">{(a.quantityM3 || 0).toFixed(2)} m³</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">Редовете са попълнени от актовете — може да добавите транспорт, помпа и др. След запис актовете се водят фактурирани.</p>
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
            <div className="space-y-2"><Label>Основание за нулева ставка{items.some(i => i.vatRate === 0) ? " *" : ""}</Label><Input value={form.taxExemptionReason} onChange={e => setForm({...form, taxExemptionReason: e.target.value})} /></div>
            <div className="space-y-2"><Label>Бележки</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>

            <div className="border-t pt-3 space-y-1 text-right">
              <div className="text-sm text-muted-foreground">Сума без ДДС: {formatCurrency(subtotal)}</div>
              {form.discountPercent > 0 && <div className="text-sm text-muted-foreground">Отстъпка {form.discountPercent}%: -{formatCurrency(subtotal * form.discountPercent / 100)}</div>}
              {form.discountAmount > 0 && <div className="text-sm text-muted-foreground">Отстъпка: -{formatCurrency(form.discountAmount)}</div>}
              <div className="text-sm text-muted-foreground">ДДС: {formatCurrency(vatAmount)}</div>
              <div className="text-xl font-bold">Общо: {formatCurrency(total)}</div>
            </div>
          </CardContent>
        </Card>

        {error && <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400" role="alert">{error}</div>}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="submit" disabled={saving} variant={isOutgoing ? "outline" : "default"} className="gap-2 w-full sm:w-auto">💾 {saving ? "Запазване..." : isOutgoing ? "Запази чернова" : "Запази"}</Button>
          {isOutgoing && (
            <Button type="button" disabled={saving} onClick={() => save(true)} className="gap-2 w-full sm:w-auto">✅ Запази и издай</Button>
          )}
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">Отказ</Button>
        </div>
      </form>
    </div>
  );
}
