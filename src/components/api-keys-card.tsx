"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KeyRound, Trash2 } from "lucide-react";
import { useIsAdmin } from "@/lib/use-is-admin";

type Key = { id: number; name: string; active: boolean; createdAt: string };

// Ключове за външни AI клиенти (/api/tools/call). Вижда се само от администратор.
export function ApiKeysCard() {
  const isAdmin = useIsAdmin();
  return isAdmin ? <ApiKeysList /> : null;
}

function ApiKeysList() {
  const [keys, setKeys] = useState<Key[] | null>(null);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => fetch("/api/api-keys").then(r => (r.ok ? r.json() : null)).then(setKeys).catch(() => setKeys(null));
  useEffect(() => { load(); }, []);
  if (!keys) return null;

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { alert("❌ " + (data.error || "Грешка")); return; }
    setCreated(data.key); setName(""); load();
  }

  async function toggle(k: Key) {
    await fetch(`/api/api-keys/${k.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !k.active }) });
    load();
  }

  async function remove(k: Key) {
    if (!confirm(`Изтриване на ключ „${k.name}“? Системите, които го ползват, губят достъп.`)) return;
    await fetch(`/api/api-keys/${k.id}`, { method: "DELETE" });
    load();
  }

  return (
    <Card>
      <CardHeader><CardTitle><KeyRound className="h-5 w-5 inline mr-2" />API ключове за външни системи</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          За AI клиенти през <code>POST /api/tools/call</code> с <code>Authorization: Bearer &lt;ключ&gt;</code>.
          Ключът има права на мениджър (без потребители, настройки и backup).
        </p>
        <div className="flex gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Име, напр. Hermes" maxLength={100} />
          <Button type="button" onClick={create} disabled={busy || !name.trim()}>Нов ключ</Button>
        </div>
        {created && (
          <div className="rounded-md border border-green-600/40 bg-green-600/10 p-3 text-sm space-y-1">
            <div>Копирайте ключа сега — после не може да се види отново:</div>
            <code className="block break-all font-mono select-all" data-testid="new-api-key">{created}</code>
            <Button type="button" variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(created); }}>Копирай</Button>
          </div>
        )}
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Няма създадени ключове.</p>
        ) : (
          <ul className="divide-y text-sm">
            {keys.map(k => (
              <li key={k.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className={`font-medium truncate ${k.active ? "" : "line-through text-muted-foreground"}`}>{k.name}</div>
                  <div className="text-xs text-muted-foreground">{k.createdAt.slice(0, 10)} · {k.active ? "активен" : "спрян"}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => toggle(k)}>{k.active ? "Спри" : "Пусни"}</Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(k)} aria-label="Изтрий"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
