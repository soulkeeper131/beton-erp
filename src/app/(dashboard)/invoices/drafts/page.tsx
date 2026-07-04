"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X, Edit } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function InvoiceDraftsPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/invoices?status=draft")
      .then((r) => r.json())
      .then((d) => {
        setDrafts(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, []);

  const parseNotes = (notes: string | null) => {
    if (!notes) return null;
    try {
      return JSON.parse(notes);
    } catch {
      return { source: "manual" };
    }
  };

  const approve = async (id: number) => {
    setActionLoading(id);
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    setDrafts(drafts.filter((d) => d.id !== id));
    setActionLoading(null);
  };

  const reject = async (id: number) => {
    if (!confirm("Сигурни ли сте, че искате да отхвърлите тази чернова?")) return;
    setActionLoading(id);
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    setDrafts(drafts.filter((d) => d.id !== id));
    setActionLoading(null);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Зареждане...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/invoices")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">📥 Чернови — входящи фактури</h1>
      </div>

      {drafts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Няма чернови за одобрение</p>
          <p className="text-sm mt-1">
            Конфигурирайте IMAP в Настройки и използвайте бутона "Обработи имейли"
          </p>
        </div>
      )}

      {drafts.map((draft) => {
        const meta = parseNotes(draft.notes);
        const confidence = meta?.confidence || "low";
        const confidenceColors: Record<string, string> = {
          high: "bg-green-100 text-green-800",
          medium: "bg-yellow-100 text-yellow-800",
          low: "bg-red-100 text-red-800",
        };

        return (
          <Card key={draft.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {draft.number}{" "}
                  <span className="text-sm text-muted-foreground font-normal">
                    от {formatDate(draft.date)}
                  </span>
                </CardTitle>
                <Badge className={confidenceColors[confidence]}>
                  {confidence === "high" ? "🟢 Високо" : confidence === "medium" ? "🟡 Средно" : "🔴 Ниско"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-col md:flex-row">
                {/* PDF Preview */}
                {draft.pdfPath && (
                  <div className="flex-1 min-h-[400px] border rounded">
                    <iframe
                      src={`/api/files?path=${encodeURIComponent(draft.pdfPath)}`}
                      className="w-full h-[400px]"
                      title="Оригинален PDF"
                    />
                  </div>
                )}

                {/* Extracted Data */}
                <div className="flex-1 space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Доставчик: </span>
                    <span className="font-medium">
                      {draft.clientName || draft.clientCompany || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Сума: </span>
                    <span className="font-bold">{formatCurrency(draft.total)} {draft.currency}</span>
                  </div>
                  {draft.vatAmount > 0 && (
                    <div>
                      <span className="text-muted-foreground">ДДС: </span>
                      {formatCurrency(draft.vatAmount)} EUR
                    </div>
                  )}
                  {meta?.originalNumber && (
                    <div>
                      <span className="text-muted-foreground">Оригинален №: </span>
                      {meta.originalNumber}
                    </div>
                  )}
                  {meta?.from && (
                    <div className="text-xs text-muted-foreground mt-2">
                      От имейл: {meta.from}
                      <br />
                      Тема: {meta.subject}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      size="sm"
                      onClick={() => approve(draft.id)}
                      disabled={actionLoading === draft.id}
                      className="gap-1"
                    >
                      <Check className="h-3 w-3" /> Одобри
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/invoices/${draft.id}`)}
                      className="gap-1"
                    >
                      <Edit className="h-3 w-3" /> Редактирай
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => reject(draft.id)}
                      disabled={actionLoading === draft.id}
                      className="gap-1"
                    >
                      <X className="h-3 w-3" /> Отхвърли
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Fetch Button */}
      {drafts.length === 0 && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={async () => {
              setLoading(true);
              const res = await fetch("/api/invoices/process-email", { method: "POST" });
              const data = await res.json();
              if (data.created > 0) {
                // Refresh
                window.location.reload();
              } else {
                alert(data.error || "Няма нови имейли с фактури");
                setLoading(false);
              }
            }}
          >
            📬 Обработи имейли сега
          </Button>
        </div>
      )}
    </div>
  );
}
