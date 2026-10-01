"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useIsAdmin } from "@/lib/use-is-admin";

// /concrete-types/new — нов тип; /concrete-types/<id> — редакция.
// Преди бутоните в списъка водеха към несъществуващи страници.
export default function ConcreteTypePage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [form, setForm] = useState({ name: "", className: "", pricePerM3: "", description: "", active: true });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/concrete-types/${id}`).then(r => r.json()).then(d => {
      if (d.error) setError(d.error);
      else setForm({ name: d.name || "", className: d.className || "", pricePerM3: String(d.pricePerM3 ?? ""), description: d.description || "", active: d.active !== false });
      setLoading(false);
    });
  }, [id, isNew]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Въведете име");
    if (!(parseFloat(form.pricePerM3) >= 0)) return setError("Въведете цена за m³");
    setSaving(true);
    const res = await fetch(isNew ? "/api/concrete-types" : `/api/concrete-types/${id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, pricePerM3: parseFloat(form.pricePerM3) }),
    });
    if (res.ok) { router.push("/concrete-types"); return; }
    setError((await res.json().catch(() => null))?.error || "Грешка при запис");
    setSaving(false);
  }

  if (loading) return <div className="p-6 text-muted-foreground">Зареждане...</div>;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/concrete-types")}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">🧱 {isNew ? "Нов тип бетон" : form.name || "Тип бетон"}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Данни</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Име *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="C20/25" disabled={!isAdmin} /></div>
              <div className="space-y-2"><Label>Клас</Label><Input value={form.className} onChange={e => setForm({ ...form, className: e.target.value })} placeholder="B25" disabled={!isAdmin} /></div>
            </div>
            <div className="space-y-2">
              <Label>Цена за m³ (без ДДС) *</Label>
              <Input type="number" step="0.01" min="0" value={form.pricePerM3} onChange={e => setForm({ ...form, pricePerM3: e.target.value })} disabled={!isAdmin} />
              <p className="text-xs text-muted-foreground">Цена по подразбиране в нови оферти и актове. Вече създадените не се променят.</p>
            </div>
            <div className="space-y-2"><Label>Описание</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} disabled={!isAdmin} /></div>
            {!isNew && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} disabled={!isAdmin} />
                Активен (предлага се в нови оферти и актове)
              </label>
            )}
            {error && <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400" role="alert">{error}</div>}
            {isAdmin && <Button type="submit" disabled={saving}>{saving ? "Запазване..." : "💾 Запази"}</Button>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
