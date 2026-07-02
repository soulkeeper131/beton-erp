"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail } from "lucide-react";

type Props = {
  defaultEmail?: string;
  defaultSubject?: string;
  getPdfBase64: () => Promise<{ base64: string; filename: string } | null>;
};

export function EmailDialog({ defaultEmail = "", defaultSubject = "", getPdfBase64 }: Props) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("Здравейте,\n\nПриложено Ви изпращаме документа.\n\nПоздрави!");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSend = async () => {
    setSending(true);
    setStatus("idle");
    try {
      let pdfBase64: string | undefined;
      let pdfFilename: string | undefined;
      const pdf = await getPdfBase64();
      if (pdf) {
        pdfBase64 = pdf.base64;
        pdfFilename = pdf.filename;
      }

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to, subject,
          html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
          pdfBase64, pdfFilename,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Грешка");
      setStatus("ok");
      setTimeout(() => setOpen(false), 1500);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStatus("idle"); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => {
          setTo(defaultEmail);
          setSubject(defaultSubject);
        }}>
          <Mail className="h-4 w-4 mr-1" /> Изпрати
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Изпрати по имейл</DialogTitle>
          <DialogDescription>Документът ще бъде прикачен като PDF.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>До</Label>
            <Input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="client@example.com" />
          </div>
          <div>
            <Label>Относно</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Съобщение</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={4} />
          </div>
        </div>
        {status === "error" && <p className="text-sm text-destructive">{errorMsg}</p>}
        {status === "ok" && <p className="text-sm text-green-600">✅ Изпратено успешно!</p>}
        <DialogFooter>
          <Button onClick={handleSend} disabled={sending || !to || !subject}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
            {sending ? "Изпращане..." : "Изпрати"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
