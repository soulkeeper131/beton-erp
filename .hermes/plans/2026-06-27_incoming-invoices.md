# Входящи фактури — два варианта за въвеждане и верификация

> **For Hermes:** Use this plan to implement incoming invoice entry + email gateway + verification flow.

**Goal:** Два независими начина за въвеждане на входящи фактури (ръчен + имейл gateway) и процес за верификация/одобрение.

**Architecture:** Ръчният вариант обогатява съществуващата форма `/invoices/new` с входящо-специфични полета и таб. Имейл gateway-ят ползва IMAP за извличане на PDF фактури от пощенска кутия, парсва ги и ги създава като "чернови" за одобрение от админ.

**Tech Stack:** Next.js 14 API routes, nodemailer (вече инсталиран), pdf-parse (нов), node-imap (нов), съществуваща DrizzleORM + SQLite

---

## Част A: Ръчно въвеждане на входящи фактури

### Task A1: Табове "Изходящи / Входящи" на списъка с фактури

**Objective:** Добави табове за филтриране по направление на `/invoices` страницата

**Files:**
- Modify: `src/app/(dashboard)/invoices/page.tsx`

**Step 1: Добави табове и филтър по direction**

```tsx
const [tab, setTab] = useState<"all" | "outgoing" | "incoming">("all");

// Филтриране
const filtered = data.filter(i => {
  const matchesTab = tab === "all" || i.direction === tab;
  const matchesSearch = !search || 
    i.number?.toLowerCase().includes(search.toLowerCase()) ||
    i.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    i.clientCompany?.toLowerCase().includes(search.toLowerCase());
  return matchesTab && matchesSearch;
});
```

Добави таб бутони преди search бара:
```tsx
<div className="flex gap-2">
  {(["all","outgoing","incoming"] as const).map(t => (
    <Button key={t} size="sm" variant={tab===t?"default":"outline"} onClick={()=>setTab(t)}>
      {t==="all"?"Всички":t==="outgoing"?"📤 Изходящи":"📥 Входящи"}
    </Button>
  ))}
</div>
```

**Step 2: Коригирай заглавието на колоната "Клиент"**

При tab === "incoming", показвай "Доставчик" вместо "Клиент" в колоната.

**Step 3: Verify**
- `npm run dev` → отвори `/invoices`
- Табовете трябва да филтрират правилно

---

### Task A2: Разделни номера за входящи фактури

**Objective:** Входящите фактури да имат префикс "ВХ-" + пореден номер, изходящите "ИЗХ-"

**Files:**
- Modify: `src/app/api/invoices/route.ts` (GET + POST)
- Modify: `src/app/(dashboard)/invoices/new/page.tsx`

**Step 1: Добави auto-number генерация в GET**

```ts
export async function GET() {
  // ... existing auth check ...
  
  const result = db.select({...}).from(invoices)...;
  
  // Add next number suggestion
  const outgoingCount = db.select({ count: sql<number>`count(*)` })
    .from(invoices).where(eq(invoices.direction, "outgoing")).get();
  const incomingCount = db.select({ count: sql<number>`count(*)` })
    .from(invoices).where(eq(invoices.direction, "incoming")).get();
  
  return NextResponse.json({ 
    data: result,
    nextOutgoing: `ИЗХ-${String((outgoingCount?.count||0)+1).padStart(6,'0')}`,
    nextIncoming: `ВХ-${String((incomingCount?.count||0)+1).padStart(6,'0')}`,
  });
}
```

**Step 2: Адаптирай страницата да чете новия формат на отговор**

```tsx
const [nextNumber, setNextNumber] = useState("");
useEffect(() => {
  fetch("/api/invoices").then(r => r.json()).then(d => {
    setData(d.data || d);
    setNextNumber(d.nextOutgoing || "");
  });
}, []);
```

**Step 3: Автоматично обновявай номера при смяна на direction**

```tsx
// В onChange за direction бутоните:
onClick={() => {
  setForm({...form, direction: "incoming", number: nextIncoming});
  // fetch nextIncoming от API
}}
```

**Step 4: Verify** — създай една входяща и една изходяща, провери номерата

---

### Task A3: EIK търсене и за входящи

**Objective:** При входяща фактура, EIK полето да търси доставчик (същата CompanyBook интеграция)

**Files:**
- Modify: `src/app/(dashboard)/invoices/new/page.tsx`

**Step 1: Вече работи!** — EIK търсенето в момента работи независимо от direction. Просто провери, че при direction="incoming" картата с данни показва коректно "Доставчик".

**Step 2: Коригирай заглавието на картата динамично**

```tsx
<CardHeader>
  <CardTitle>{isOutgoing ? "Получател" : "Доставчик"}</CardTitle>
</CardHeader>
```

Вече е така — само проверка.

**Step 3: Verify** — изпрати входяща фактура с нов доставчик чрез EIK търсене

---

## Част B: Имейл Gateway за автоматично получаване на входящи фактури

### Task B1: Инсталирай нови пакети

**Objective:** Добави pdf-parse и imap библиотеки

```bash
cd /root/beton-erp
npm install pdf-parse node-imap
npm install -D @types/node-imap
```

**Verify:** `npm ls pdf-parse node-imap`

---

### Task B2: Добави IMAP настройки в Company Settings

**Objective:** Разшири схемата и UI за IMAP настройки

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/app/api/company-settings/route.ts`
- Modify: `src/app/(dashboard)/settings/page.tsx`

**Step 1: Schema — добави колони**

```ts
// В companySettings таблицата добави:
imapHost: text("imap_host").notNull().default(""),
imapPort: integer("imap_port").notNull().default(993),
imapUser: text("imap_user").notNull().default(""),
imapPass: text("imap_pass").notNull().default(""),
imapTls: integer("imap_tls", { mode: "boolean" }).notNull().default(true),
incomingEmailFolder: text("incoming_email_folder").notNull().default("INBOX"),
```

**Step 2: Миграция — добави ALTER TABLE в db/index.ts**

```ts
const imapCols = [
  "ALTER TABLE company_settings ADD COLUMN imap_host TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE company_settings ADD COLUMN imap_port INTEGER NOT NULL DEFAULT 993",
  "ALTER TABLE company_settings ADD COLUMN imap_user TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE company_settings ADD COLUMN imap_pass TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE company_settings ADD COLUMN imap_tls INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE company_settings ADD COLUMN incoming_email_folder TEXT NOT NULL DEFAULT 'INBOX'",
];
for (const sql of imapCols) {
  try { db.run(sql); } catch {}
}
```

**Step 3: API — добави IMAP полета в GET/PATCH**

В GET и PATCH рутовете на `/api/company-settings` добави новите полета.

**Step 4: UI — добави IMAP секция в настройките**

```tsx
<Card>
  <CardHeader><CardTitle>📥 Имейл за входящи фактури</CardTitle></CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input label="IMAP Хост" value={...} />
      <Input label="IMAP Порт" type="number" value={...} />
    </div>
    <Input label="Потребител" value={...} />
    <Input label="Парола" type="password" value={...} />
    <div className="flex items-center gap-2">
      <Checkbox ... /> <Label>TLS</Label>
    </div>
    <Input label="Папка" value={...} placeholder="INBOX" />
    <Button onClick={testImap}>🧪 Тест IMAP</Button>
  </CardContent>
</Card>
```

**Step 5: Verify** — отвори `/settings`, попълни IMAP данни, натисни "Тест IMAP"

---

### Task B3: Създай IMAP fetcher API endpoint

**Objective:** API ендпойнт, който проверява пощата за нови фактури и ги извлича

**Files:**
- Create: `src/app/api/invoices/fetch-email/route.ts`
- Create: `src/lib/imap.ts`

**Step 1: IMAP utility**

```ts
// src/lib/imap.ts
import Imap from "node-imap";
import { simpleParser } from "mailparser";

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface FetchedEmail {
  uid: number;
  subject: string;
  from: string;
  date: Date;
  text: string;
  attachments: EmailAttachment[];
}

export async function fetchUnreadInvoices(config: {
  host: string; port: number; user: string; password: string;
  tls: boolean; folder: string;
}): Promise<FetchedEmail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: { rejectUnauthorized: false },
    });

    const results: FetchedEmail[] = [];

    imap.once("ready", () => {
      imap.openBox(config.folder || "INBOX", false, (err) => {
        if (err) { imap.end(); reject(err); return; }

        imap.search(["UNSEEN"], (err, uids) => {
          if (err || !uids.length) { imap.end(); resolve([]); return; }

          const fetch = imap.fetch(uids, { bodies: "", struct: true });
          let count = 0;

          fetch.on("message", (msg) => {
            let body = "";
            msg.on("body", (stream) => {
              stream.on("data", (chunk) => { body += chunk.toString("utf8"); });
            });
            msg.once("attributes", (attrs) => {
              msg.once("end", async () => {
                try {
                  const parsed = await simpleParser(body);
                  const attachments: EmailAttachment[] = [];
                  if (parsed.attachments) {
                    for (const att of parsed.attachments) {
                      attachments.push({
                        filename: att.filename || "unknown",
                        contentType: att.contentType,
                        content: att.content,
                      });
                    }
                  }
                  results.push({
                    uid: attrs.uid,
                    subject: parsed.subject || "",
                    from: parsed.from?.text || "",
                    date: parsed.date || new Date(),
                    text: parsed.text || "",
                    attachments,
                  });
                } catch {}
                count++;
                if (count === uids.length) { imap.end(); resolve(results); }
              });
            });
          });
        });
      });
    });

    imap.once("error", reject);
    imap.connect();
  });
}
```

**Step 2: API route**

```ts
// src/app/api/invoices/fetch-email/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { fetchUnreadInvoices } from "@/lib/imap";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = db.select().from(companySettings).limit(1).get();
  if (!settings?.imapHost) {
    return NextResponse.json({ error: "IMAP не е конфигуриран" }, { status: 400 });
  }

  try {
    const emails = await fetchUnreadInvoices({
      host: settings.imapHost,
      port: settings.imapPort,
      user: settings.imapUser,
      password: settings.imapPass,
      tls: settings.imapTls,
      folder: settings.incomingEmailFolder,
    });

    return NextResponse.json({ count: emails.length, emails });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

**Step 3: Verify** — извикай `POST /api/invoices/fetch-email` (с валидна сесия)

---

### Task B4: PDF Parser за извличане на данни от фактури

**Objective:** Извличане на ключови полета от PDF фактура (номер, дата, сума, доставчик)

**Files:**
- Create: `src/lib/invoice-parser.ts`

**Step 1: Парсване на PDF**

```ts
// src/lib/invoice-parser.ts
import pdfParse from "pdf-parse";

export interface ParsedInvoice {
  supplierName?: string;
  supplierEik?: string;
  supplierVat?: string;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  total?: number;
  vatAmount?: number;
  currency?: string;
  items?: { description: string; quantity: number; price: number; total: number }[];
  rawText: string;
  confidence: "high" | "medium" | "low";
}

export async function parseInvoicePdf(buffer: Buffer): Promise<ParsedInvoice> {
  const data = await pdfParse(buffer);
  const text = data.text;

  const result: ParsedInvoice = { rawText: text, confidence: "low" };

  // Extract EIK (9 or 13 digits, preceded by "ЕИК" or "EIK")
  const eikMatch = text.match(/(?:ЕИК|EIK)[:\s]*(\d{9}|\d{13})/i);
  if (eikMatch) result.supplierEik = eikMatch[1];

  // Extract VAT number (BG + digits)
  const vatMatch = text.match(/(?:ДДС\s*(?:№|номер)|VAT)[:\s]*(BG\d{9,10})/i);
  if (vatMatch) result.supplierVat = vatMatch[1];

  // Extract invoice number
  const numMatch = text.match(/(?:Фактура|ФАКТУРА|Invoice|INVOICE)\s*(?:№|No|#)?[:\s]*([A-ZА-Я0-9\-]+)/i);
  if (numMatch) result.invoiceNumber = numMatch[1];

  // Extract dates (DD.MM.YYYY or YYYY-MM-DD)
  const dateMatches = text.match(/(\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})/g);
  if (dateMatches) {
    if (dateMatches[0]) result.date = normalizeDate(dateMatches[0]);
    if (dateMatches[1]) result.dueDate = normalizeDate(dateMatches[1]);
  }

  // Extract total (look for "ОБЩО", "Total", "Сума за плащане" followed by number)
  const totalMatch = text.match(/(?:ОБЩО|TOTAL|Сума\s*за\s*плащане)[:\s]*(\d[\d\s]*[.,]\d{2})/i);
  if (totalMatch) result.total = parseFloat(totalMatch[1].replace(/\s/g, "").replace(",", "."));

  // Extract company name (first line or after "ДОСТАВЧИК" / "SUPPLIER")
  const supplierMatch = text.match(/(?:Доставчик|Supplier|ПРОДАВАЧ)[:\s]*\n?([^\n]+)/i);
  if (supplierMatch) result.supplierName = supplierMatch[1].trim();

  // Set confidence
  if (result.supplierEik && result.invoiceNumber && result.total) result.confidence = "high";
  else if (result.invoiceNumber || result.total) result.confidence = "medium";

  return result;
}

function normalizeDate(d: string): string {
  if (d.includes(".")) {
    const [day, month, year] = d.split(".");
    return `${year}-${month}-${day}`;
  }
  return d;
}
```

**Step 2: Verify** — създай тестов PDF, извикай parseInvoicePdf

---

### Task B5: API endpoint за автоматично създаване на чернова от имейл

**Objective:** Комбинира IMAP fetch + PDF parse → създава draft входяща фактура

**Files:**
- Create: `src/app/api/invoices/process-email/route.ts`

**Step 1: Endpoint**

```ts
// src/app/api/invoices/process-email/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { companySettings, invoices, invoiceItems, clients } from "@/db/schema";
import { fetchUnreadInvoices } from "@/lib/imap";
import { parseInvoicePdf } from "@/lib/invoice-parser";
import { eq } from "drizzle-orm";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = db.select().from(companySettings).limit(1).get();
  if (!settings?.imapHost) {
    return NextResponse.json({ error: "IMAP не е конфигуриран" }, { status: 400 });
  }

  try {
    const emails = await fetchUnreadInvoices({
      host: settings.imapHost,
      port: settings.imapPort,
      user: settings.imapUser,
      password: settings.imapPass,
      tls: settings.imapTls,
      folder: settings.incomingEmailFolder,
    });

    const created: any[] = [];

    for (const email of emails) {
      // Find first PDF attachment
      const pdfAtt = email.attachments.find(a => 
        a.contentType.includes("pdf") || a.filename.endsWith(".pdf")
      );
      if (!pdfAtt) continue;

      // Parse PDF
      const parsed = await parseInvoicePdf(pdfAtt.content);

      // Save PDF
      const pdfDir = path.join(process.cwd(), "data", "incoming-invoices");
      mkdirSync(pdfDir, { recursive: true });
      const pdfPath = path.join(pdfDir, `${Date.now()}-${pdfAtt.filename}`);
      writeFileSync(pdfPath, pdfAtt.content);

      // Look up or create supplier client
      let supplierId = null;
      if (parsed.supplierEik) {
        const existing = db.select().from(clients).where(eq(clients.eik, parsed.supplierEik)).get();
        if (existing) {
          supplierId = existing.id;
        } else if (parsed.supplierName) {
          const created = db.insert(clients).values({
            name: parsed.supplierName,
            companyName: parsed.supplierName,
            eik: parsed.supplierEik,
            vatNumber: parsed.supplierVat,
          }).returning().get();
          supplierId = created.id;
        }
      }

      // Create draft invoice
      const incomingCount = db.select({ count: sql<number>`count(*)` })
        .from(invoices).where(eq(invoices.direction, "incoming")).get();
      const number = `ВХ-${String((incomingCount?.count||0)+1).padStart(6,'0')}`;

      const invoice = db.insert(invoices).values({
        clientId: supplierId || 0,
        number: parsed.invoiceNumber || number,
        date: parsed.date || email.date.toISOString().split("T")[0],
        dueDate: parsed.dueDate || "",
        taxEventDate: parsed.date || email.date.toISOString().split("T")[0],
        direction: "incoming",
        type: "invoice",
        currency: "EUR",
        subtotal: parsed.total || 0,
        total: parsed.total || 0,
        vatAmount: parsed.vatAmount || 0,
        paymentStatus: "unpaid",
        status: "draft", // Чернова за ръчно одобрение
        pdfPath,
        notes: `Автоматично от имейл. Тема: ${email.subject}. Confidence: ${parsed.confidence}`,
      }).returning().get();

      // Add a line item if we have items
      if (parsed.items?.length) {
        for (const item of parsed.items) {
          db.insert(invoiceItems).values({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            vatRate: 20,
            total: item.total,
          }).run();
        }
      }

      created.push({ id: invoice.id, number: invoice.number, confidence: parsed.confidence });
    }

    return NextResponse.json({ created, count: created.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

---

### Task B6: Страница за преглед и одобрение на чернови

**Objective:** UI където админ вижда автоматично създадените чернови, редом с оригиналния PDF, и може да одобри/редактира/отхвърли

**Files:**
- Create: `src/app/(dashboard)/invoices/drafts/page.tsx`
- Modify: `src/app/(dashboard)/invoices/page.tsx` (добави линк към drafts)

**Step 1: API — филтриране на draft фактури**

Разшири GET `/api/invoices` да поддържа `?status=draft` query param:

```ts
const { searchParams } = new URL(req.url);
const status = searchParams.get("status");
// ...
if (status) where.push(eq(invoices.status, status));
```

**Step 2: Drafts page**

```tsx
// src/app/(dashboard)/invoices/drafts/page.tsx
"use client";
export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  
  useEffect(() => {
    fetch("/api/invoices?status=draft").then(r => r.json()).then(d => setDrafts(d.data || d));
  }, []);

  return (
    <div className="space-y-6">
      <h1>📥 Чернови на входящи фактури</h1>
      {drafts.map(draft => (
        <Card key={draft.id}>
          <CardContent className="flex gap-4">
            {/* PDF preview */}
            {draft.pdfPath && (
              <iframe src={`/api/files?path=${encodeURIComponent(draft.pdfPath)}`} className="w-1/2 h-96 border" />
            )}
            {/* Extracted data */}
            <div className="flex-1">
              <p>Номер: {draft.number}</p>
              <p>Дата: {draft.date}</p>
              <p>Сума: {draft.total} EUR</p>
              <p>Confidence: {draft.notes?.includes("high") ? "🟢" : "🟡"}</p>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => approve(draft.id)}>✅ Одобри</Button>
                <Button variant="outline" onClick={() => router.push(`/invoices/${draft.id}/edit`)}>✏️ Редактирай</Button>
                <Button variant="destructive" onClick={() => reject(draft.id)}>❌ Отхвърли</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Step 3: Одобрение (API)**

```ts
// PATCH /api/invoices/[id] — смени status от "draft" на "sent"
```

**Step 4: Добави линк в главната invoices страница**

```tsx
{isAdmin && (
  <Button variant="outline" onClick={() => router.push("/invoices/drafts")}>
    📥 Чернови
  </Button>
)}
```

**Step 5: Verify** — симулирай процес: fetch email → parse → виж draft → одобри

---

### Task B7: Cron job за автоматично извличане на имейли

**Objective:** На всеки 30 минути проверява за нови имейли с фактури

**Step 1: Създай cron job чрез Hermes**

```bash
hermes cron create \
  --name "Входящи фактури от имейл" \
  --schedule "*/30 * * * *" \
  --prompt "POST /api/invoices/process-email в beton-erp проекта. Ако върне created > 0, докладвай с брой и номера. Ако грешка — само ако е различна от 'няма нови'."
```

---

## Част C: Верификация и качество

### Task C1: Добави статус индикатор за confidence

**Objective:** Визуален индикатор в списъка с фактури за автоматично извлечените

**Files:**
- Modify: `src/app/(dashboard)/invoices/page.tsx`

**Step 1:** За draft фактури показвай икона 🤖 и confidence level (от notes полето)

---

### Task C2: Side-by-side сравнение на PDF + извлечени данни

**Objective:** В детайлния изглед на входяща фактура, покажи PDF редом с полетата

**Files:**
- Modify: `src/app/(dashboard)/invoices/[id]/page.tsx`

**Step 1:** Ако invoice.pdfPath съществува и direction === "incoming", покажи iframe с PDF до данните:

```tsx
{invoice.pdfPath && invoice.direction === "incoming" && (
  <Card>
    <CardHeader><CardTitle>📄 Оригинален документ</CardTitle></CardHeader>
    <CardContent>
      <iframe src={`/api/files?path=${encodeURIComponent(invoice.pdfPath)}`} 
              className="w-full h-[600px] border rounded" />
    </CardContent>
  </Card>
)}
```

---

## Тестване и валидация

1. **Ръчен flow:** Направи входяща фактура през формата → провери в списъка → виж детайли
2. **Имейл flow:** Изпрати PDF фактура на IMAP адреса → изчакай cron → виж draft → одобри
3. **Edge cases:** PDF без EIK, PDF с грешна дата, имейл без attachment, дублиран имейл

---

## Рискове

- **PDF парсване не е 100% точно** — затова има draft/approve flow. Confidence индикаторът помага.
- **IMAP провайдери** — Gmail изисква app password, Microsoft 365 — OAuth2. За MVP ползваме app password.
- **Големи PDF файлове** — слагаме лимит 10MB.

---

## Зависимости

- `pdf-parse` (npm)
- `node-imap` (npm)
- `mailparser` (npm — идва с node-imap като dependency)
- IMAP mailbox (препоръчително: специален акаунт `fakturi@blv.bg`)
