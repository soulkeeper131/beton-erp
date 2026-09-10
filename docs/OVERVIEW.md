# Beton ERP — Документация и План за развитие

> Един документ: техническа документация + roadmap. Актуален към септември 2026.
> Repo: `github.com/soulkeeper131/beton-erp` | Production: `https://beton.blv.bg`

---

## 1. Общ преглед

**Beton ERP** е специализирана ERP система за бизнес с бетон: клиенти, обекти, оферти, актуване (протоколи за изливане), фактури, машини, склад, работници и календар. Изградена е като single-instance приложение за фирмата (не multi-tenant), self-hosted през Coolify.

**Основен работен процес:**
```
Клиент → Обект → Оферта → Бетониране/Акт → Фактура
```

Вградено има **AI асистент** (чат през DeepSeek), който управлява цялата система чрез 33 инструмента на естествен език.

---

## 2. Технологичен стек

| Слой | Технология | Версия |
|---|---|---|
| Frontend | Next.js (App Router) + React | 14.2 / 18.3 |
| UI | Tailwind CSS + shadcn/ui (Radix) | 3.4 |
| Backend | Next.js API Routes | — |
| База данни | SQLite (better-sqlite3) + Drizzle ORM | 11.3 / 0.33 |
| Auth | NextAuth.js v5 (Credentials, JWT) | 5.0.0-beta.25 |
| PDF | @react-pdf/renderer (+ DejaVu Sans за кирилица) | 3.4 |
| AI | DeepSeek Chat API + Function Calling (SSE streaming) | — |
| Карти | Leaflet + OpenStreetMap | 1.9 |
| Email | Nodemailer (SMTP) + node-imap (IMAP) + mailparser + pdf-parse | — |
| Снимки | exifreader (GPS от EXIF) | 4.4 |
| Хостинг | Docker + Coolify (auto-deploy от `main`) | — |

**Пакетен мениджър:** npm (lock file `package-lock.json`).

---

## 3. Архитектура

```
Discord/Hermes ─┐
Браузър UI ─────┤
Външен AI ──────┤  ┌─────────────────────────────────────────┐
                ├─▶│  middleware.ts (rate-limit + auth)        │
                │  │    ├─ cookie сесия (authjs.session-token) │
                │  │    └─ Bearer API_KEY                      │
                │  └─────────────────┬───────────────────────┘
                │                    ▼
                │  ┌─────────────────────────────────────────┐
                │  │  App Router                              │
                │  │   ├─ (dashboard)/  → UI страници         │
                │  │   └─ api/          → REST endpoints      │
                │  │         └─ api/agent/chat → AI агент     │
                │  └─────────────────┬───────────────────────┘
                │                    ▼
                │  ┌─────────────────────────────────────────┐
                │  │  src/lib/agent/ (system-prompt + tools)  │
                │  │  src/db/ (Drizzle schema + better-sqlite3)│
                │  └─────────────────┬───────────────────────┘
                │                    ▼
                │               data/sqlite.db (WAL)
```

### Ключови компоненти

- **`src/db/index.ts`** — връзката с SQLite: auto-create на таблици + **inline миграции** (ALTER TABLE с try-catch, НЕ drizzle-kit push). Това е „единият източник на истина" за реалната схема в production.
- **`src/db/schema.ts`** — Drizzle schema (типобезопасна), използвана от ORM заявките.
- **`src/middleware.ts`** — rate limiting (100 req/min/IP), публични пътища, static-file bypass, Bearer API key, redirect към login.
- **`src/auth.ts` / `src/auth.config.ts`** — NextAuth Credentials provider.
- **`src/lib/agent/`** — AI агентът (system prompt + 33 tool handlers).

### Структура на проекта

```
beton-erp/
├── src/
│   ├── app/
│   │   ├── (dashboard)/        # Защитени страници (клиенти, обекти, оферти, актове,
│   │   │                        #  фактури, машини, работници, материали, услуги,
│   │   │                        #  календар, карта, потребители, настройки, одит лог)
│   │   ├── api/                # REST endpoints (всички с force-dynamic)
│   │   │   └── agent/chat      # AI чат (SSE)
│   │   └── login/
│   ├── components/
│   │   ├── ui/                 # shadcn компоненти (button, dialog, select, table…)
│   │   ├── layout/             # shell + sidebar
│   │   ├── pdf/                # offer/invoice/act PDF генератори
│   │   ├── chat/               # AI чат widget
│   │   ├── photo-gallery.tsx
│   │   └── email-dialog.tsx
│   ├── db/                     # index.ts (init+миграции), schema.ts, seed.ts
│   ├── lib/
│   │   ├── agent/              # tools.ts, system-prompt.ts
│   │   ├── audit.ts, notifications.ts, rate-limit.ts,
│   │   ├── imap.ts, invoice-parser.ts, auth-helpers.ts, use-is-admin.ts
│   └── types/
├── public/                     # process.html, api-docs.html, guide.html, manifest, sw.js
├── data/                       # sqlite.db (gitignored)
├── docs/                       # тази документация
├── design/vision.html          # визуален дизайн референт
├── Dockerfile
└── next.config.mjs
```

---

## 4. Модули

| Модул | Описание | Основни endpoint-и |
|---|---|---|
| 🏢 Клиенти | CRUD + ЕИК auto-search (CompanyBook) | `/api/clients` |
| 🏗️ Обекти | CRUD, GPS, статус (active/completed/cancelled) | `/api/sites` |
| 🗺️ Карта | Интерактивна карта на обектите | `/api/sites/map` |
| 📄 Оферти | CRUD + items + PDF + имейл | `/api/offers`, `/api/offers/[id]/items`, `/pdf` |
| 🔨 Актове | CRUD + multi-line items + PDF + снимки | `/api/pourings`, `/api/pourings/[id]/pdf` |
| 🧾 Фактури | Входящи/изходящи, PDF, имейл, auto-numbering, process-email | `/api/invoices` |
| 🚛 Машини | CRUD + поддръжка (винетка/ГО/преглед) | `/api/machines`, `/maintenance` |
| 🧱 Типове бетон | Каталог с цени | `/api/concrete-types` |
| 🛠️ Услуги | Услуги + варианти (service_items) | `/api/services`, `/items` |
| 📦 Материали | Склад | `/api/materials` |
| 👷 Работници | Персонал с дневни ставки | `/api/workers` |
| 📅 Календар | Насрочени наряди | `/api/calendar` |
| 📷 Снимки | Качване с GPS (EXIF) + reverse geocode | `/api/photos`, `/api/geocode` |
| 👤 Потребители | Админ CRUD (роли) | `/api/users` |
| ⚙️ Настройки | Фирмени данни, лого, SMTP/IMAP, AI ключ | `/api/company-settings` |
| 📋 Одит лог | Лог на всички действия | `/api/audit-log` |
| 📊 Dashboard | KPI агрегации | `/api/dashboard/stats` |
| 🤖 AI агент | Чат + инструменти + външен API | `/api/agent/chat`, `/api/tools`, `/api/tools/call` |
| 🧱 Каталог | Структуриран каталог за dropdown-и | `/api/catalog` |
| 📧 Имейл | Изпращане + SMTP/IMAP тест | `/api/send-email`, `/smtp-test`, `/imap-test` |
| 🔍 CompanyBook | Търсене по ЕИК | `/api/companybook` |
| 💾 Backup | Backup на SQLite (admin) | `/api/backup` |
| 📤 Експорт | CSV | `/api/export` |

Пълният списък на API-то е в `public/api-docs.html` и в README.

---

## 5. База данни

SQLite файл: `data/sqlite.db` (WAL режим, `foreign_keys = ON`). Таблиците се създават автоматично при старт от `src/db/index.ts`.

**27 таблици:**

| Таблица | Статус | Бележка |
|---|---|---|
| `users` | ✅ активна | 2 seed потребителя |
| `clients`, `sites` | ✅ активна | |
| `concrete_types` | ✅ активна | 21 seed записа |
| `offers`, `offer_items` | ✅ активна | |
| `pourings`, `pouring_items` | ✅ активна | multi-line актове |
| `invoices`, `invoice_items` | ✅ активна | |
| `machines`, `machine_maintenance` | ✅ активна | |
| `services`, `service_items` | ✅ активна | variants |
| `materials` | ✅ активна | само базов CRUD |
| `workers` | ✅ активна | само базов CRUD |
| `site_calendar` | ✅ активна | календар |
| `templates` | ✅ активна | `/api/templates` |
| `act_photos` | ✅ активна | снимки + GPS |
| `audit_log` | ✅ активна | одит |
| `api_keys` | ⚠️ частична | таблица има, ключът реално е в env `API_KEY` |
| `company_settings` | ✅ активна | singleton (1 ред) |
| `chat_sessions`, `chat_messages` | ✅ активна | история на AI чата |
| `act_workers` | ⚠️ мъртва | **само PDF чете** — няма UI/API за добавяне на работници към акт |
| `act_materials` | ❌ мъртва | **няма никакъв код** |
| `worker_attendance` | ⚠️ частична | само dashboard чете — няма CRUD за явки/заплати |
| `material_deliveries` | ❌ мъртва | **няма никакъв код** |

> ⚠️ **Несъответствие schema vs. production:** `schema.ts` и `index.ts` се разминават на някои места. Реалната production база се определя от inline миграциите в `index.ts`. Например `index.ts` добавя `city`, GPS колони и др. през ALTER TABLE, които `schema.ts` вече ги има (или обратно). При работа с Drizzle ползвай `schema.ts`, но при raw SQL миграции — винаги през `index.ts` с try-catch.

**Статуси:**
- Оферти: `draft → sent → accepted | rejected`
- Фактури: `draft → sent`, плащане `unpaid → partial → paid`
- Обекти: `active | completed | cancelled`

**Валута:** само EUR за фактури; оферти/актове в лева (лв).

---

## 6. Автентикация и сигурност

- **Auth:** NextAuth v5, Credentials provider. Сесия в cookie `authjs.session-token`. Login: `POST /api/auth/callback/credentials`.
- **Роли:** `admin` (пълен достъп) и `employee` (само GET). *Забележка:* README споменава `manager`/`brigadir`, но в seed-а и в schema-та коментарите са само `admin | employee` — ролите не са разширени реално.
- **API Key:** `Authorization: Bearer <API_KEY>` — env var `API_KEY` (за AI/автоматизация).
- **Rate limiting:** 100 req/min/IP в middleware (in-memory, per-instance).
- **Одит лог:** `audit_log` таблица + `src/lib/audit.ts` (create/update/delete/login).
- **Backup:** `/api/backup` (admin), ротация до 7 копия.
- **Пароли:** bcryptjs (hash cost 10).

### Environment variables

```env
AUTH_SECRET=            # NextAuth secret (openssl rand -base64 32)
AUTH_URL=http://localhost:3000
DEEPSEEK_API_KEY=       # ключ за AI агента
COMPANYBOOK_API_KEY=    # CompanyBook (ЕИК търсене) — fallback в DB company_settings
API_KEY=                # Bearer token за външен достъп
```

---

## 7. AI агент

- **Вход:** `src/lib/agent/system-prompt.ts` (български, домейн правила) + `src/lib/agent/tools.ts` (33 инструмента).
- **Инструменти:** search/get/list/create за всички модули + admin (`list_users`, `create_user`, `update_user`, `get_settings`, `update_settings`, `create_backup`), `lookup_company` (ЕИК), `generate_offer_pdf`, `send_offer_email`, `update_offer_status`, `update_invoice_payment`, `get_catalog`, `get_dashboard_stats`, `get_calendar`.
- **Streaming:** `/api/agent/chat` връща SSE — `{delta}` за всеки token, `{done: true, sessionId}` накрая.
- **Външен достъп:** `/api/tools` (JSON Schema дефиниции) + `/api/tools/call` — за Claude/GPT интеграция през Bearer token.
- **Правила (от system prompt):** винаги `get_catalog()` преди `create_offer()`, винаги `lookup_company()` преди `create_client()` с ЕИК, винаги иска потвърждение преди write операции, не измисля цени/клиенти.

---

## 8. PDF генериране

Всички документи (оферта, фактура, акт) ползват `@react-pdf/renderer` с формат **Образец 19**.

Критични изисквания:
1. **Кирилица:** задължителен `DejaVu Sans` (вградената Helvetica няма кирилски глифове). Регистрира се с `Font.register()` от `/usr/share/fonts/truetype/dejavu/`.
2. **Dockerfile** изисква `fonts-dejavu-core` apt пакет.
3. **Content-Disposition header** — само ASCII (кирилското име на файл чупи header-а → sanitize към ASCII).
4. Неподдържани CSS: `letterSpacing`, `gap`, `textTransform: uppercase` на кирилица, `fontFamily: Helvetica-Bold`.

---

## 9. Деплой (Coolify + Docker)

- **Production:** `https://beton.blv.bg`, auto-deploy от `main` branch.
- **Coolify UUID:** `ja190ku5qh8glfeu0sqzcf4p`.
- **Dockerfile:** `node:22`, `npm install --legacy-peer-deps`, инсталира `fonts-dejavu-core`, `npm run build`, старт с `next start`.
- **Volume:** `data/` (SQLite) е монтиран persistent.
- **Build:** `next.config.mjs` игнорира TS/ESLint грешки (за да не чупи build). Всички API routes с DB import имат `export const dynamic = 'force-dynamic'` (иначе `SQLITE_BUSY` при static prerender).

---

## 10. Известни нюанси (pitfalls)

1. **`force-dynamic`** задължителен на всеки API route, който import-ва от `@/db` — иначе `SQLITE_BUSY` / prerender fail по време на Docker build.
2. **`API_KEY` трябва да е runtime (не buildtime)** в Coolify — иначе middleware-ът не го вижда.
3. **Кирилски PDF filename** → 500 error в Content-Disposition. Sanitize към ASCII.
4. **DejaVu Sans** задължителен за кирилица в PDF.
5. **EIK auto-search** — debounce 600ms в onChange, НЕ `useEffect([form.eik])` (React 18 batching чупи desktop).
6. **shadcn Select** — `value` не трябва да е `undefined` (falsy `0` става `undefined`); ползвай `""` като fallback.
7. **iOS mobile** — fullscreen overlay изисква `100dvh`, `env(safe-area-inset-*)`, body scroll lock, input 16px, touch targets 44px.
8. **ALTER TABLE в SQLite** — винаги извън `exec()` блок, с try-catch (иначе спира целия block и чупи следващите CREATE TABLE).
9. **Миграциите са inline в `db/index.ts`** — drizzle-kit push е flaky, ползвай ръчни ALTER с try-catch.

---

## 11. План за развитие (Roadmap)

Приоритизиран по бизнес стойност. „Няма код" = таблицата съществува, но нищо не я ползва.

### 🔴 Фаза 1 — Съответствие и завършване на ядрото (висок приоритет)

1. **Наредба Н-18 / фискална съвместимост (СУПТО)**
   - Изходящите фактури и актове трябва да отговарят на изискванията на Н-18 за софтуер за управление (фискална памет, номерация, нередактируемост на издадени документи).
   - Текущо документите могат да се редактират свободно след издаване — риск.
   - *Skill наличен: `bulgarian-fiscal-compliance`.*

2. **Активиране на „мъртвите" таблици** (вече в schema, липсва UI/API):
   - `act_workers` — добавяне на работници към акт (часове, ставки) с CRUD.
   - `act_materials` — материали към акт.
   - `material_deliveries` — приход/разход на склад (в момента складът е статичен).
   - `worker_attendance` — явки, извънреден труд, аванси, месечни заплати.

3. **Разширяване на ролите** — `manager`, `brigadir` (README ги споменава, реално липсват). Специфични права: бригадир — само календар + снимки на обекта.

### 🟡 Фаза 2 — Отчетност и операции (среден приоритет)

4. **Разширени справки/отчети** — печалба по обект/клиент, разход по машина, справка за материали, сравнение „офертирано vs. актувано" в по-дълбок детайл.
5. **Складова книга** — пълен приход/разход с history (ползва `material_deliveries`).
6. **Автоматични нотификации** — изтичащи винетки/ГО/прегледи (данните вече са в `machines`), ниски наличности, неплатени фактури.
7. **Recurring оферти/фактури** — месечни доставки, договорни цени.

### 🟢 Фаза 3 — Качество и мащаб (нисък приоритет)

8. **Автоматични тестове** — в момента няма нито един тест (няма test framework). Минимум: API smoke tests + PDF генерация.
9. **Backup автоматизация** — offsite (S3/Drive) + криптиране, а не само локална ротация.
10. **Изчистване на schema drift** — уеднаквяване на `schema.ts` ↔ `index.ts` миграциите (преминаване към единна миграционна стратегия).
11. **PWA push notifications** за наряди и срокове (manifest + sw вече има).
12. **Многоезичност** — ниско приоритетно (вътрешен инструмент, български е достатъчен).

### Бързи победи (може веднага)

- Добави `created_at`/`updated_at` на таблиците, които ги нямат (`machines`, `workers`, `materials` и др.) — за по-добър audit.
- Логиране на миграционни грешки (някои catch-ове гълтат грешки мълчаливо).
- Извади тестовите пароли от seed в production (поне принуди смяна при първи login).

---

## 12. Тестови акаунти

| Роля | Email | Парола |
|---|---|---|
| Админ | admin@beton.bg | admin123 |
| Служител | employee@beton.bg | employee123 |

*(README споменава и `manager@beton.bg` / `brigadir@beton.bg`, но seed-ът реално създава само двете по-горе.)*
