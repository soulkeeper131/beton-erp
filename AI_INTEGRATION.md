# Beton ERP — AI Integration Guide

> **Препоръчителен AI асистент:** Hermes Agent (вече свързан с Discord, зареден skill)  
> **Алтернативи:** OpenCode, Claude Code — само за code generation, НЕ за операции с ERP

---

## Вариант 1: Hermes Agent (✅ Препоръчителен)

**Защо Hermes:**
- Вече е свързан с Discord → Влади пита от телефона, Hermes изпълнява
- Skill система — `beton-erp` skill се зарежда автоматично
- Terminal tool → curl заявки директно към API-то
- Memory → помни клиенти, обекти, контекст между сесии
- Cron → автоматични проверки (изтичащи винетки, неплатени фактури)

**Как работи:**
1. Влади пише в Discord: *"Направи оферта за BRONIC, B20, 50m³"*
2. Hermes зарежда `beton-erp` skill → вижда API документацията
3. Hermes изпълнява curl заявки:
   ```bash
   # Намира BRONIC
   curl -b cookies.txt https://beton.blv.bg/api/clients
   # Създава оферта
   curl -b cookies.txt -X POST https://beton.blv.bg/api/offers \
     -H "Content-Type: application/json" \
     -d '{"clientId":2,"date":"2026-07-04"}'
   # Добавя ред с B20
   curl -b cookies.txt -X POST https://beton.blv.bg/api/offers/6/items \
     -H "Content-Type: application/json" \
     -d '{"concreteTypeId":3,"quantityM3":50,"pricePerM3":170,"itemType":"concrete"}'
   ```
4. Hermes отговаря: *"✅ Оферта ОФ-2026-0006 създадена. Общо: 8 500 лв."*

**Auth:** Hermes може да ползва cookie сесия. Или API ключ (виж Вариант 3).

---

## Вариант 2: Discord директно (чрез Hermes Gateway)

Hermes вече е в Discord кариера `#general`. Всички съобщения от Влади минават през него.

**Примерни заявки от Discord:**
```
"Колко неизплатени фактури имаме?"
"Добави нов клиент Стройком ООД с ЕИК 123456789"
"Направи акт за обект 3, B30, 20m³, днес"
"Покажи dashboard"
"Изпрати оферта 5 на имейл"
```

---

## Вариант 3: Standalone API (за всякакъв AI)

### API Base URL
```
https://beton.blv.bg/api
```

### Auth с API Key (без browser cookies)

Добави `Authorization: Bearer YOUR_API_KEY` header към всяка заявка.

API ключовете се създават през `/admin/api-keys` (само за admin).

```bash
# Пример: създаване на оферта
curl -X POST https://beton.blv.bg/api/offers \
  -H "Authorization: Bearer sk-xxx" \
  -H "Content-Type: application/json" \
  -d '{"clientId":2,"date":"2026-07-04","items":[{"concreteTypeId":3,"quantityM3":50,"pricePerM3":170,"itemType":"concrete"}]}'
```

### OpenAPI схема (за Claude Code / OpenCode)

Ако използваш Claude Code или OpenCode за интеграция, те могат да четат API схемата от този документ. Всички endpoints връщат JSON.

**Claude Code подход:**
```bash
# Claude Code може да извиква curl директно:
claude "Създай оферта за клиент id=2, бетон B20 (id=3), 50m³"
# → Claude чете този документ → генерира curl → изпълнява
```

**OpenCode подход:**
```bash
# OpenCode също поддържа terminal команди:
opencode "Провери dashboard статистиката"
# → Чете /api/dashboard/stats → форматира отговор
```

### Python SDK (опростен)

```python
import requests

class BetonERP:
    def __init__(self, base_url="https://beton.blv.bg", token=None, cookie_jar=None):
        self.base = base_url
        self.session = requests.Session()
        if token:
            self.session.headers["Authorization"] = f"Bearer {token}"
        if cookie_jar:
            self.session.cookies = cookie_jar
        # Login if needed
        if not token and not cookie_jar:
            self.login("admin@beton.bg", "admin123")

    def login(self, email, password):
        # NextAuth credentials flow
        csrf = self.session.get(f"{self.base}/api/auth/csrf").json()
        r = self.session.post(f"{self.base}/api/auth/callback/credentials", data={
            "email": email, "password": password,
            "csrfToken": csrf["csrfToken"],
            "callbackUrl": f"{self.base}",
            "redirect": "false", "json": "true"
        })
        return r.ok

    # --- Clients ---
    def list_clients(self): return self._get("/api/clients")
    def create_client(self, **data): return self._post("/api/clients", data)
    def get_client(self, id): return self._get(f"/api/clients/{id}")

    # --- Offers ---
    def list_offers(self): return self._get("/api/offers")
    def create_offer(self, client_id, **kwargs):
        return self._post("/api/offers", {"clientId": client_id, "date": kwargs.pop("date", "2026-07-04"), **kwargs})
    def add_offer_item(self, offer_id, concrete_type_id=None, service_id=None, quantity_m3=1, price_per_m3=0, **kwargs):
        return self._post(f"/api/offers/{offer_id}/items", {
            "itemType": "concrete" if concrete_type_id else "service",
            "concreteTypeId": concrete_type_id,
            "serviceId": service_id,
            "quantityM3": quantity_m3,
            "pricePerM3": price_per_m3,
            **kwargs
        })

    # --- Invoices ---
    def list_invoices(self, status=None): return self._get("/api/invoices" + (f"?status={status}" if status else ""))
    def create_invoice(self, **data): return self._post("/api/invoices", {**data, "currency": "EUR"})

    # --- Dashboard ---
    def dashboard(self): return self._get("/api/dashboard/stats")

    # --- Internal ---
    def _get(self, path): return self.session.get(f"{self.base}{path}").json()
    def _post(self, path, data): return self.session.post(f"{self.base}{path}", json=data).json()
```

---

## Сравнение

| | Hermes | Discord | Claude Code | OpenCode | curl |
|---|---|---|---|---|---|
| **Чат интерфейс** | ✅ Discord | ✅ | ❌ CLI | ❌ CLI | ❌ |
| **Разбиране на NL** | ✅ LLM | ❌ (през Hermes) | ✅ LLM | ✅ LLM | ❌ |
| **Memory между сесии** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Автоматични задачи** | ✅ cron | ❌ | ❌ | ❌ | ❌ |
| **Code generation** | ✅ | ❌ | ✅✅ | ✅✅ | ❌ |
| **API операции** | ✅ | ❌ | ⚠️ | ⚠️ | ✅ |
| **Мобилен достъп** | ✅ Discord | ✅ | ❌ | ❌ | ❌ |
| **PDF генериране** | ✅ | ❌ | ❌ | ❌ | ✅ |

**Извод:** Hermes за ежедневни операции и чат. Claude Code/OpenCode — само ако трябва да се пише нов код за ERP-то.

---

## Quick Start за Hermes

1. **Skill-ът е готов** — `~/.hermes/skills/beton-erp/beton-erp/SKILL.md`
2. **Discord е свързан** — пиши в `#general`
3. **Auth:** Hermes ползва cookie сесия или API ключ

### Примерни cron задачи за Hermes:

```bash
# Ежедневен dashboard сутрин в 8:30
hermes cron create --name "beton-daily-dashboard" --schedule "30 8 * * *" \
  --prompt "Провери dashboard на beton.blv.bg и докладвай ключовите KPI-та"

# Проверка за изтичащи документи на машини (всеки понеделник)
hermes cron create --name "beton-expiring-docs" --schedule "0 9 * * 1" \
  --prompt "Провери машините в beton.blv.bg за изтичащи винетки, ГО и технически прегледи през следващите 30 дни"

# Автоматично извличане на входящи фактури от имейл
hermes cron create --name "beton-fetch-invoices" --schedule "*/30 * * * *" \
  --prompt "POST към https://beton.blv.bg/api/invoices/process-email и докладвай резултата"
```
