"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Mail, CheckCircle, XCircle, Inbox } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [form, setForm] = useState({
    companyName: "", companyNameBG: "", eik: "", vatNumber: "",
    address: "", city: "", phone: "", email: "", mol: "",
    bankName: "", iban: "", bic: "",
    smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "",
    smtpFrom: "", smtpSecure: false,
    imapHost: "", imapPort: 993, imapUser: "", imapPass: "",
    imapTls: true, incomingEmailFolder: "INBOX",
  });

  useEffect(() => {
    fetch("/api/company-settings").then(r => r.json()).then(d => {
      if (d && !d.error) setForm({
        companyName: d.companyName || "", companyNameBG: d.companyNameBG || "",
        eik: d.eik || "", vatNumber: d.vatNumber || "",
        address: d.address || "", city: d.city || "",
        phone: d.phone || "", email: d.email || "", mol: d.mol || "",
        bankName: d.bankName || "", iban: d.iban || "", bic: d.bic || "",
        smtpHost: d.smtpHost || "", smtpPort: d.smtpPort || 587,
        smtpUser: d.smtpUser || "", smtpPass: d.smtpPass || "",
        smtpFrom: d.smtpFrom || "", smtpSecure: !!d.smtpSecure,
        imapHost: d.imapHost || "", imapPort: d.imapPort || 993,
        imapUser: d.imapUser || "", imapPass: d.imapPass || "",
        imapTls: !!d.imapTls, incomingEmailFolder: d.incomingEmailFolder || "INBOX",
      });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/company-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) alert("✅ Запазено");
    else alert("❌ Грешка");
  }

  async function testSmtp() {
    if (!form.email) { alert("Въведи имейл за тест"); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/smtp-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      setTestResult({ ok: res.ok, msg: data.message || data.error });
    } catch {
      setTestResult({ ok: false, msg: "Грешка при свързване" });
    }
    setTesting(false);
  }

  async function testImap() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/imap-test", { method: "POST" });
      const data = await res.json();
      setTestResult({ ok: res.ok, msg: data.message || data.error });
    } catch {
      setTestResult({ ok: false, msg: "Грешка при свързване" });
    }
    setTesting(false);
  }

  const u = (f: string, v: any) => setForm({...form, [f]: v});

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">⚙️ Настройки</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Фирмени данни */}
        <Card>
          <CardHeader><CardTitle>🏢 Данни за фирмата</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Име на фирма</Label><Input value={form.companyName} onChange={e => u("companyName", e.target.value)} /></div>
              <div><Label>Име на кирилица</Label><Input value={form.companyNameBG} onChange={e => u("companyNameBG", e.target.value)} /></div>
              <div><Label>ЕИК</Label><Input value={form.eik} onChange={e => u("eik", e.target.value)} /></div>
              <div><Label>ДДС номер (BG...)</Label><Input value={form.vatNumber} onChange={e => u("vatNumber", e.target.value)} /></div>
              <div><Label>Град</Label><Input value={form.city} onChange={e => u("city", e.target.value)} /></div>
              <div><Label>Адрес</Label><Input value={form.address} onChange={e => u("address", e.target.value)} /></div>
              <div><Label>Телефон</Label><Input value={form.phone} onChange={e => u("phone", e.target.value)} /></div>
              <div><Label>Имейл</Label><Input value={form.email} onChange={e => u("email", e.target.value)} /></div>
              <div className="md:col-span-2"><Label>МОЛ</Label><Input value={form.mol} onChange={e => u("mol", e.target.value)} /></div>
              <div><Label>Банка</Label><Input value={form.bankName} onChange={e => u("bankName", e.target.value)} /></div>
              <div><Label>IBAN</Label><Input value={form.iban} onChange={e => u("iban", e.target.value)} /></div>
              <div><Label>BIC</Label><Input value={form.bic} onChange={e => u("bic", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* SMTP */}
        <Card>
          <CardHeader><CardTitle>📧 Мейл сървър (SMTP)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2"><Label>SMTP Хост</Label><Input value={form.smtpHost} onChange={e => u("smtpHost", e.target.value)} placeholder="smtp.gmail.com" /></div>
              <div><Label>Порт</Label><Input type="number" value={form.smtpPort} onChange={e => u("smtpPort", parseInt(e.target.value) || 587)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Потребител</Label><Input value={form.smtpUser} onChange={e => u("smtpUser", e.target.value)} /></div>
              <div><Label>Парола</Label><Input type="password" value={form.smtpPass} onChange={e => u("smtpPass", e.target.value)} placeholder="Оставено празно = без промяна" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Изпращач (From)</Label><Input value={form.smtpFrom} onChange={e => u("smtpFrom", e.target.value)} placeholder="office@firmata.bg" /></div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.smtpSecure} onChange={e => u("smtpSecure", e.target.checked)} className="w-4 h-4" />
                  SSL/TLS
                </label>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={testSmtp} disabled={testing || !form.smtpHost} className="gap-1">
                <Mail className="h-3 w-3" /> {testing ? "Изпращане..." : "Тест мейл"}
              </Button>
              {testResult && (
                <span className={`text-sm flex items-center gap-1 ${testResult.ok ? "text-green-600" : "text-red-600"}`}>
                  {testResult.ok ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {testResult.msg}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* IMAP */}
        <Card>
          <CardHeader><CardTitle>📥 Входящи фактури (IMAP)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2"><Label>IMAP Хост</Label><Input value={form.imapHost} onChange={e => u("imapHost", e.target.value)} placeholder="imap.gmail.com" /></div>
              <div><Label>Порт</Label><Input type="number" value={form.imapPort} onChange={e => u("imapPort", parseInt(e.target.value) || 993)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Потребител</Label><Input value={form.imapUser} onChange={e => u("imapUser", e.target.value)} /></div>
              <div><Label>Парола</Label><Input type="password" value={form.imapPass} onChange={e => u("imapPass", e.target.value)} placeholder="Оставено празно = без промяна" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div><Label>Папка</Label><Input value={form.incomingEmailFolder} onChange={e => u("incomingEmailFolder", e.target.value)} placeholder="INBOX" /></div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.imapTls} onChange={e => u("imapTls", e.target.checked)} className="w-4 h-4" />
                TLS
              </label>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={testImap} disabled={testing || !form.imapHost} className="gap-1">
                <Inbox className="h-3 w-3" /> {testing ? "Проверка..." : "Тест IMAP"}
              </Button>
              {testResult && (
                <span className={`text-sm flex items-center gap-1 ${testResult.ok ? "text-green-600" : "text-red-600"}`}>
                  {testResult.ok ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {testResult.msg}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Запазване..." : "Запази всички настройки"}
        </Button>
      </form>
    </div>
  );
}
