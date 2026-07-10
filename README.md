# 🏗️ Beton ERP

ERP система за управление на строителен бизнес, специализиран в полагане на бетон.

**Демо:** [https://beton.blv.bg](https://beton.blv.bg) | **Документация на процесите:** [process.html](https://beton.blv.bg/process.html)

---

## 📋 Функционалности

| Модул | Описание |
|---|---|
| 🏢 **Клиенти** | CRUD + автоматично търсене по ЕИК/CompanyBook |
| 🏗️ **Обекти** | Управление на строителни обекти с GPS координати, снимки с EXIF |
| 🗺️ **Карта** | Интерактивна карта с всички обекти, прогрес барове, цветни маркери |
| 📄 **Оферти** | Създаване на оферти с PDF генериране (Образец 19), каталог shortcut |
| 🔨 **Актуване** | Актове с множество редове, PDF (Образец 19), връзка с оферти |
| 🧾 **Фактури** | Входящи/изходящи фактури, PDF с кирилица, имейл изпращане, auto-numbering |
| 🚛 **Машини** | Управление на машини с проследяване на поддръжка |
| 🧱 **Материали** | Складово управление |
| 🏷️ **Типове бетон** | Каталог с цени |
| 🛠️ **Услуги** | Услуги с варианти и свързани машини |
| 👷 **Работници** | Управление на персонал |
| 📅 **Календар** | Събития и планиране |
| 👤 **Потребители** | Админ управление на потребители и роли |
| 🤖 **AI Агент** | Чат с DeepSeek (16 инструмента), външен API за Claude/GPT |
| ⚙️ **Настройки** | Фирмени данни, лого, цветове, SMTP/IMAP, AI ключ |
| 📊 **Dashboard** | Статистики в реално време |
| 📋 **Одит лог** | Проследяване на всички действия |

---

## 🛠️ Технологичен стек

| Слой | Технология |
|---|---|
| **Frontend** | Next.js 14 (App Router), React, Tailwind CSS |
| **Backend** | Next.js API Routes, tRPC-ready |
| **База данни** | SQLite (libsql) + Drizzle ORM |
| **Auth** | NextAuth.js (Credentials) |
| **PDF** | @react-pdf/renderer (DejaVu Sans за кирилица) |
| **AI** | DeepSeek Chat API + Function Calling |
| **Карти** | Leaflet + OpenStreetMap |
| **Email** | Nodemailer (SMTP) |
| **Хостинг** | Docker + Coolify |

---

## 🚀 Инсталация

```bash
# Клониране
git clone https://github.com/soulkeeper131/beton-erp.git
cd beton-erp

# Инсталация на зависимости
npm install

# Създаване на .env
cp .env.example .env
# Редактирай .env с твоите стойности

# Инициализация на базата
npm run db:push
npm run db:seed

# Стартиране (dev)
npm run dev
# Отвори http://localhost:3000
```

### Environment Variables

```env
AUTH_SECRET=                # NextAuth secret (openssl rand -base64 32)
AUTH_URL=http://localhost:3000
DEEPSEEK_API_KEY=           # DeepSeek API ключ
COMPANYBOOK_API_KEY=        # CompanyBook API ключ (за ЕИК търсене)
API_KEY=                    # API ключ за външен достъп (AI/автоматизация)
```

### Docker

```bash
docker build -t beton-erp .
docker run -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e AUTH_SECRET=... \
  beton-erp
```

---

## 🚢 Деплой (Coolify)

Проектът е конфигуриран за автоматичен деплой през Coolify:
- **Production:** `https://beton.blv.bg`
- **Auto-deploy:** Включен за `main` branch
- **Ръчен деплой:** `POST /api/v1/deploy {uuid: "ja190ku5qh8glfeu0sqzcf4p"}`

---

## 📡 API

### Автентикация

Всички API заявки изискват сесия (cookie) **или** Bearer token:

```bash
curl -H "Authorization: Bearer *** /api/clients
```

### Основни ендпойнти

| Метод | Път | Описание |
|---|---|---|
| `GET` | `/api/clients` | Списък с клиенти |
| `POST` | `/api/clients` | Нов клиент |
| `GET` | `/api/offers` | Списък с оферти |
| `POST` | `/api/offers` | Нова оферта |
| `GET` | `/api/offers/[id]/pdf` | PDF на оферта |
| `GET` | `/api/invoices` | Списък с фактури |
| `POST` | `/api/invoices` | Нова фактура |
| `GET` | `/api/invoices/[id]/pdf` | PDF на фактура |
| `GET` | `/api/pourings` | Списък с актове |
| `POST` | `/api/pourings` | Нов акт |
| `GET` | `/api/catalog` | Структуриран каталог |
| `GET` | `/api/sites/map` | Обекти за картата |
| `GET` | `/api/dashboard/stats` | Статистики |
| `GET` | `/api/users` | Потребители (admin) |
| `POST` | `/api/users` | Нов потребител (admin) |
| `POST` | `/api/backup` | Backup на базата (admin) |
| `GET` | `/api/export?table=clients` | CSV експорт (admin) |

### AI Agent API

| Метод | Път | Описание |
|---|---|---|
| `POST` | `/api/agent/chat` | Чат с AI агента (DeepSeek) |
| `GET` | `/api/tools` | Дефиниции на инструментите |
| `POST` | `/api/tools/call` | Извикване на инструмент (външен AI) |

---

## 📄 PDF Документи

Всички PDF-и използват **Образец 19** (класически български формат):
- Четима кирилица (DejaVu Sans)
- Лого и акцентен цвят от настройките
- Номерация, дати, суми, банкова сметка, подписи

---

## 🔐 Сигурност

- **Rate limiting:** 100 заявки/минута/IP
- **Session-based auth:** NextAuth.js
- **Role-based access:** Admin / Manager / Brigadir / Employee
- **API key auth:** Bearer token за автоматизация
- **CSP headers:** В middleware
- **SQLite backup:** Автоматична ротация (7 копия)

---

## 📁 Структура на проекта

```
beton-erp/
├── src/
│   ├── app/
│   │   ├── (dashboard)/        # Основно приложение
│   │   │   ├── clients/        # Клиенти
│   │   │   ├── sites/          # Обекти
│   │   │   ├── offers/         # Оферти
│   │   │   ├── pourings/       # Актуване
│   │   │   ├── invoices/       # Фактури
│   │   │   ├── machines/       # Машини
│   │   │   ├── workers/        # Работници
│   │   │   ├── materials/      # Склад
│   │   │   ├── services/       # Услуги
│   │   │   ├── users/          # Потребители (admin)
│   │   │   ├── settings/       # Настройки
│   │   │   ├── map/            # Карта
│   │   │   └── calendar/       # Календар
│   │   ├── api/                # API ендпойнти
│   │   └── login/              # Вход
│   ├── components/
│   │   ├── ui/                 # UI компоненти (shadcn-style)
│   │   ├── layout/             # Shell, sidebar
│   │   ├── pdf/                # PDF генератори
│   │   └── chat/               # AI чат widget
│   ├── lib/
│   │   ├── agent/              # AI agent (system prompt, tools)
│   │   ├── notifications.ts    # Email известия
│   │   └── rate-limit.ts       # Rate limiter
│   └── db/                     # Drizzle schema + seed
├── public/
│   ├── process.html            # Бизнес процеси (Mermaid диаграми)
│   ├── manifest.json           # PWA
│   └── sw.js                   # Service Worker
├── data/                       # SQLite база + uploads + backups
├── Dockerfile
└── README.md
```

---

## 🧪 Тестови акаунти

| Роля | Email | Парола |
|---|---|---|
| Админ | admin@beton.bg | admin123 |
| Мениджър | manager@beton.bg | manager123 |
| Бригадир | brigadir@beton.bg | brigadir123 |

---

## 📝 Лиценз

Частен проект. Всички права запазени © BLV Systems
