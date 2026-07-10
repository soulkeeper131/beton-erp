// /src/lib/agent/tools.ts

import { db } from "@/db";
import { clients, offers, offerItems, pourings, pouringItems, sites, concreteTypes, services, materials, machines, siteCalendar, invoices, invoiceItems, workers } from "@/db/schema";
import { eq, like, or, and, desc, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
  handler: (params: any, userId: number) => Promise<any>;
  requiresConfirmation?: boolean;
}

// ─── Helpers ───

function likeQuery(col: any, q: string) {
  return like(col, `%${q}%`);
}

async function getCompanySettings() {
  const { companySettings } = await import("@/db/schema");
  return db.select().from(companySettings).get();
}

// ─── Tool Handlers ───

async function searchClients(params: { query: string }) {
  const q = params.query;
  const rows = db.select().from(clients)
    .where(or(likeQuery(clients.name, q), likeQuery(clients.companyName, q), likeQuery(clients.eik, q)))
    .limit(10).all();
  return rows.map(c => ({ id: c.id, name: c.name, company: c.companyName, eik: c.eik, phone: c.phone }));
}

async function getClient(params: { clientId: number }) {
  const c = db.select().from(clients).where(eq(clients.id, params.clientId)).get();
  if (!c) return { error: "Клиентът не е намерен" };
  const clientSites = db.select({ id: sites.id, name: sites.name, city: sites.city }).from(sites).where(eq(sites.clientId, c.id)).all();
  return { ...c, sites: clientSites };
}

async function listSites() {
  const rows = db.select({
    id: sites.id, name: sites.name, city: sites.city, address: sites.address,
    status: sites.status, latitude: sites.latitude, longitude: sites.longitude
  }).from(sites).all();
  return rows;
}

async function getSite(params: { siteId: number }) {
  const s = db.select().from(sites).where(eq(sites.id, params.siteId)).get();
  if (!s) return { error: "Обектът не е намерен" };
  const siteOffers = db.select({ id: offers.id, number: offers.number, status: offers.status, total: offers.total }).from(offers).where(eq(offers.siteId, s.id)).all();
  const sitePourings = db.select({ id: pourings.id, date: pourings.date, status: pourings.status }).from(pourings).where(eq(pourings.siteId, s.id)).all();
  return { ...s, offers: siteOffers, pourings: sitePourings };
}

async function listOffers(params: { siteId?: number; status?: string }) {
  const conds = [];
  if (params.siteId) conds.push(eq(offers.siteId, params.siteId));
  if (params.status) conds.push(eq(offers.status, params.status));
  const rows = db.select({ id: offers.id, number: offers.number, date: offers.date, total: offers.total, status: offers.status, clientName: clients.name }).from(offers).leftJoin(clients, eq(offers.clientId, clients.id)).where(and(...conds)).orderBy(desc(offers.date)).limit(20).all();
  return rows;
}

async function getCatalog() {
  const ct = db.select({ id: concreteTypes.id, name: concreteTypes.name, className: concreteTypes.className, pricePerM3: concreteTypes.pricePerM3 })
    .from(concreteTypes).where(eq(concreteTypes.active, true)).all();
  const svc = db.select({ id: services.id, name: services.name, description: services.description, unit: services.unit, basePrice: services.basePrice })
    .from(services).where(eq(services.active, true)).all();
  const mach = db.select({ id: machines.id, name: machines.name, type: machines.type })
    .from(machines).where(eq(machines.status, "available")).all();
  const mat = db.select({ id: materials.id, name: materials.name, unit: materials.unit, quantity: materials.quantity })
    .from(materials).all();
  const wrk = db.select({ id: workers.id, name: workers.name, status: workers.status })
    .from(workers).where(eq(workers.status, "active")).all();
  return { concreteTypes: ct, services: svc, machines: mach, materials: mat, workers: wrk };
}

async function listConcreteTypes() {
  return db.select().from(concreteTypes).where(eq(concreteTypes.active, true)).all();
}

async function listMachines() {
  return db.select({ id: machines.id, name: machines.name, type: machines.type, status: machines.status }).from(machines).all();
}

async function listWorkers() {
  return db.select({ id: workers.id, name: workers.name, phone: workers.phone, dailyRate: workers.dailyRate, status: workers.status }).from(workers).all();
}

async function listMaterials() {
  return db.select({ id: materials.id, name: materials.name, unit: materials.unit, quantity: materials.quantity, pricePerUnit: materials.pricePerUnit }).from(materials).all();
}

async function listInvoices(params: { status?: string }) {
  const conds = [];
  if (params.status) conds.push(eq(invoices.paymentStatus, params.status));
  const rows = db.select({
    id: invoices.id, number: invoices.number, date: invoices.date, dueDate: invoices.dueDate,
    total: invoices.total, paymentStatus: invoices.paymentStatus, type: invoices.type,
    clientName: clients.name
  }).from(invoices).leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(...conds)).orderBy(desc(invoices.date)).limit(20).all();
  return rows;
}

async function getCalendar(params: { siteId?: number; dateFrom?: string }) {
  const conds = [];
  if (params.siteId) conds.push(eq(siteCalendar.siteId, params.siteId));
  if (params.dateFrom) conds.push(sql`${siteCalendar.plannedDate} >= ${params.dateFrom}`);
  const rows = db.select().from(siteCalendar).where(and(...conds)).orderBy(asc(siteCalendar.plannedDate)).all();
  return rows;
}

async function createOffer(params: any) {
  const { clientId, siteId, date, validUntil, items, notes } = params;
  const lastOffer = db.select({ number: offers.number }).from(offers).orderBy(desc(offers.id)).limit(1).get();
  const lastNum = lastOffer ? parseInt(lastOffer.number.split("-")[1] || "0") : 0;
  const number = `OF-${String(lastNum + 1).padStart(4, "0")}`;
  const total = (items || []).reduce((s: number, i: any) =>
    s + (i.quantityM3 || 0) * (i.pricePerM3 || 0) + (i.transportCost || 0) + (i.pumpCost || 0), 0);
  const result = db.insert(offers).values({ clientId, siteId: siteId || null, number, date, validUntil: validUntil || null, total, status: "draft", notes: notes || null }).returning({ id: offers.id }).get();
  for (const item of items || []) {
    const itemTotal = (item.quantityM3 || 0) * (item.pricePerM3 || 0) + (item.transportCost || 0) + (item.pumpCost || 0);
    db.insert(offerItems).values({ offerId: result.id, concreteTypeId: item.concreteTypeId || null, serviceId: item.serviceId || null, quantityM3: item.quantityM3, pricePerM3: item.pricePerM3, transportCost: item.transportCost || 0, pumpCost: item.pumpCost || 0, total: itemTotal }).run();
  }
  return { id: result.id, number, total, items: items.length };
}

async function createPouring(params: any) {
  const { siteId, offerId, date, machineId, items, weather, notes } = params;
  const totalQty = (items || []).reduce((s: number, i: any) => s + (i.quantityM3 || 0), 0);
  const totalPrice = (items || []).reduce((s: number, i: any) => s + (i.quantityM3 || 0) * (i.pricePerM3 || 0), 0);
  const result = db.insert(pourings).values({ siteId, offerId: offerId || null, date, machineId: machineId || null, quantityM3: totalQty, weather, notes, status: "completed" }).returning({ id: pourings.id }).get();
  (items || []).forEach((item: any, idx: number) => {
    const total = (item.quantityM3 || 0) * (item.pricePerM3 || 0);
    db.insert(pouringItems).values({ pouringId: result.id, concreteTypeId: item.concreteTypeId, quantityM3: item.quantityM3, pricePerM3: item.pricePerM3, total, sortOrder: idx }).run();
  });
  return { id: result.id, date, totalM3: totalQty, items: items.length };
}

async function createClient(params: any) {
  const result = db.insert(clients).values({
    name: params.name, companyName: params.companyName || null,
    eik: params.eik || null, vatNumber: params.vatNumber || null,
    address: params.address || null, phone: params.phone || null,
    email: params.email || null, notes: params.notes || null,
  }).returning({ id: clients.id }).get();
  return { id: result.id, name: params.name };
}

// ─── NEW: Create handlers for all entities ───

async function createSite(params: { clientId: number; name: string; city?: string; address?: string; notes?: string }) {
  const result = db.insert(sites).values({
    clientId: params.clientId, name: params.name,
    city: params.city || "", address: params.address || "",
    status: "active", notes: params.notes || null,
  }).returning({ id: sites.id }).get();
  return { id: result.id, name: params.name, clientId: params.clientId };
}

async function createService(params: { name: string; description?: string; unit?: string; basePrice?: number; category?: string }) {
  const result = db.insert(services).values({
    name: params.name, description: params.description || null,
    unit: params.unit || "бр.", basePrice: params.basePrice || 0,
    category: params.category || "other", active: true,
  }).returning({ id: services.id }).get();
  return { id: result.id, name: params.name, basePrice: params.basePrice };
}

async function createConcreteType(params: { name: string; className?: string; pricePerM3: number; description?: string }) {
  const result = db.insert(concreteTypes).values({
    name: params.name, className: params.className || params.name,
    pricePerM3: params.pricePerM3, description: params.description || null,
    active: true,
  }).returning({ id: concreteTypes.id }).get();
  return { id: result.id, name: params.name, pricePerM3: params.pricePerM3 };
}

async function createMachine(params: { name: string; type: string; plateNumber?: string; notes?: string }) {
  const result = db.insert(machines).values({
    name: params.name, type: params.type,
    plateNumber: params.plateNumber || null, notes: params.notes || null,
    status: "available", category: "other",
  }).returning({ id: machines.id }).get();
  return { id: result.id, name: params.name, type: params.type };
}

async function createMaterial(params: { name: string; unit: string; quantity?: number; pricePerUnit?: number }) {
  const result = db.insert(materials).values({
    name: params.name, unit: params.unit,
    quantity: params.quantity || 0, pricePerUnit: params.pricePerUnit || 0,
  }).returning({ id: materials.id }).get();
  return { id: result.id, name: params.name, unit: params.unit };
}

async function createWorker(params: { name: string; phone?: string; dailyRate: number }) {
  const result = db.insert(workers).values({
    name: params.name, phone: params.phone || null,
    dailyRate: params.dailyRate, status: "active",
  }).returning({ id: workers.id }).get();
  return { id: result.id, name: params.name, dailyRate: params.dailyRate };
}

async function createInvoice(params: { clientId: number; date: string; dueDate: string; items: any[]; type?: string; notes?: string }) {
  const { clientId, date, dueDate, items, type, notes } = params;
  const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.price, 0);
  const vatAmount = items.reduce((s: number, i: any) => s + (i.quantity * i.price * (i.vatRate || 20)) / 100, 0);
  const total = subtotal + vatAmount;
  const lastInv = db.select({ id: invoices.id }).from(invoices).orderBy(desc(invoices.id)).limit(1).get();
  const nextNum = String((lastInv?.id || 0) + 1).padStart(5, "0");
  const result = db.insert(invoices).values({
    clientId, number: nextNum, date, dueDate, taxEventDate: date,
    type: type || "invoice", direction: "outgoing", currency: "EUR",
    subtotal, vatAmount, total, paymentMethod: "bank", paymentStatus: "unpaid",
    notes: notes || null,
  }).returning({ id: invoices.id }).get();
  for (const item of items) {
    db.insert(invoiceItems).values({
      invoiceId: result.id, description: item.description,
      unit: item.unit || "бр.", quantity: item.quantity, price: item.price,
      vatRate: item.vatRate || 20, total: item.quantity * item.price,
    }).run();
  }
  return { id: result.id, number: nextNum, total, items: items.length };
}

async function generateOfferPdf(params: { offerId: number }) {
  return { url: `/api/offers/${params.offerId}/pdf`, offerId: params.offerId };
}

async function sendOfferEmail(params: { offerId: number; to: string; message?: string }) {
  try {
    const offer = db.select({ number: offers.number }).from(offers).where(eq(offers.id, params.offerId)).get();
    if (!offer) return { error: "Офертата не е намерена" };
    return { sent: true, to: params.to, offerNumber: offer.number };
  } catch (e: any) {
    return { error: `Грешка при изпращане: ${e.message}` };
  }
}

async function getDashboardStats() {
  const clientCount = db.select({ count: sql<number>`count(*)` }).from(clients).get()?.count || 0;
  const siteCount = db.select({ count: sql<number>`count(*)` }).from(sites).where(eq(sites.status, "active")).get()?.count || 0;
  const offerCount = db.select({ count: sql<number>`count(*)` }).from(offers).where(eq(offers.status, "sent")).get()?.count || 0;
  const pouringCount = db.select({ count: sql<number>`count(*)` }).from(pourings).get()?.count || 0;
  const totalM3 = db.select({ total: sql<number>`coalesce(sum(${pouringItems.quantityM3}), 0)` }).from(pouringItems).get()?.total || 0;
  return { clients: clientCount, activeSites: siteCount, activeOffers: offerCount, pourings: pouringCount, totalM3 };
}

// ─── Tool Registry ───

export const agentTools: ToolDefinition[] = [
  // ── ЧЕТЕНЕ (без потвърждение) ──
  {
    name: "search_clients",
    description: "Търси клиенти по име, компания или ЕИК. Връща списък със съвпадащи клиенти.",
    parameters: { type: "object", properties: { query: { type: "string", description: "Име, компания или ЕИК за търсене" } }, required: ["query"] },
    handler: searchClients,
  },
  {
    name: "get_client",
    description: "Връща детайли за конкретен клиент по ID, включително свързаните обекти.",
    parameters: { type: "object", properties: { clientId: { type: "integer", description: "ID на клиента" } }, required: ["clientId"] },
    handler: getClient,
  },
  {
    name: "list_sites",
    description: "Връща списък с всички обекти (строителни площадки) с координати и статус.",
    parameters: { type: "object", properties: {} },
    handler: listSites,
  },
  {
    name: "get_site",
    description: "Връща детайли за конкретен обект, включително свързаните оферти и актове.",
    parameters: { type: "object", properties: { siteId: { type: "integer", description: "ID на обекта" } }, required: ["siteId"] },
    handler: getSite,
  },
  {
    name: "list_offers",
    description: "Връща списък с оферти. Може да се филтрира по обект или статус.",
    parameters: { type: "object", properties: { siteId: { type: "integer", description: "ID на обект (опционално)" }, status: { type: "string", enum: ["draft", "sent", "accepted", "rejected"], description: "Статус (опционално)" } } },
    handler: listOffers,
  },
  {
    name: "get_catalog",
    description: "Връща пълния каталог с типове бетон, услуги, машини, материали и работници.",
    parameters: { type: "object", properties: {} },
    handler: getCatalog,
  },
  {
    name: "list_concrete_types",
    description: "Връща списък с всички активни типове бетон и цени на m³.",
    parameters: { type: "object", properties: {} },
    handler: listConcreteTypes,
  },
  {
    name: "list_machines",
    description: "Връща списък с всички машини и помпи.",
    parameters: { type: "object", properties: {} },
    handler: listMachines,
  },
  {
    name: "list_workers",
    description: "Връща списък с всички работници.",
    parameters: { type: "object", properties: {} },
    handler: listWorkers,
  },
  {
    name: "list_materials",
    description: "Връща списък с всички материали в склада.",
    parameters: { type: "object", properties: {} },
    handler: listMaterials,
  },
  {
    name: "list_invoices",
    description: "Връща списък с фактури. Може да филтрира по статус на плащане.",
    parameters: { type: "object", properties: { status: { type: "string", enum: ["unpaid", "partial", "paid"], description: "Статус на плащане (опционално)" } } },
    handler: listInvoices,
  },
  {
    name: "get_calendar",
    description: "Връща графика за обект или от определена дата нататък.",
    parameters: { type: "object", properties: { siteId: { type: "integer", description: "ID на обект (опционално)" }, dateFrom: { type: "string", description: "Начална дата YYYY-MM-DD (опционално)" } } },
    handler: getCalendar,
  },
  {
    name: "get_dashboard_stats",
    description: "Връща обобщена статистика: клиенти, обекти, оферти, актове, общо излети m³.",
    parameters: { type: "object", properties: {} },
    handler: getDashboardStats,
  },
  // ── СЪЗДАВАНЕ (изисква потвърждение) ──
  {
    name: "create_client",
    description: "СЪЗДАВА нов клиент.",
    parameters: { type: "object", properties: { name: { type: "string" }, companyName: { type: "string" }, eik: { type: "string" }, vatNumber: { type: "string" }, address: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, notes: { type: "string" } }, required: ["name"] },
    handler: createClient,
    requiresConfirmation: true,
  },
  {
    name: "create_site",
    description: "СЪЗДАВА нов строителен обект за клиент.",
    parameters: { type: "object", properties: { clientId: { type: "integer", description: "ID на клиента" }, name: { type: "string", description: "Име на обекта" }, city: { type: "string" }, address: { type: "string" }, notes: { type: "string" } }, required: ["clientId", "name"] },
    handler: createSite,
    requiresConfirmation: true,
  },
  {
    name: "create_offer",
    description: "СЪЗДАВА нова оферта. ПЪРВО извикай get_catalog.",
    parameters: { type: "object", properties: { clientId: { type: "integer" }, siteId: { type: "integer" }, date: { type: "string", description: "Дата YYYY-MM-DD" }, validUntil: { type: "string" }, items: { type: "array", items: { type: "object", properties: { concreteTypeId: { type: "integer" }, serviceId: { type: "integer" }, quantityM3: { type: "number" }, pricePerM3: { type: "number" }, transportCost: { type: "number" }, pumpCost: { type: "number" } }, required: ["quantityM3", "pricePerM3"] } }, notes: { type: "string" } }, required: ["clientId", "date", "items"] },
    handler: createOffer,
    requiresConfirmation: true,
  },
  {
    name: "create_pouring",
    description: "СЪЗДАВА нов акт за извършено бетониране.",
    parameters: { type: "object", properties: { siteId: { type: "integer" }, offerId: { type: "integer" }, date: { type: "string", description: "Дата YYYY-MM-DD" }, machineId: { type: "integer" }, items: { type: "array", items: { type: "object", properties: { concreteTypeId: { type: "integer" }, quantityM3: { type: "number" }, pricePerM3: { type: "number" } }, required: ["concreteTypeId", "quantityM3", "pricePerM3"] } }, weather: { type: "string" }, notes: { type: "string" } }, required: ["siteId", "date", "items"] },
    handler: createPouring,
    requiresConfirmation: true,
  },
  {
    name: "create_invoice",
    description: "СЪЗДАВА нова изходяща фактура за клиент.",
    parameters: { type: "object", properties: { clientId: { type: "integer" }, date: { type: "string", description: "Дата YYYY-MM-DD" }, dueDate: { type: "string", description: "Падеж YYYY-MM-DD" }, items: { type: "array", items: { type: "object", properties: { description: { type: "string" }, unit: { type: "string" }, quantity: { type: "number" }, price: { type: "number" }, vatRate: { type: "number" } }, required: ["description", "quantity", "price"] } }, type: { type: "string", enum: ["invoice", "proforma"], description: "Тип" }, notes: { type: "string" } }, required: ["clientId", "date", "dueDate", "items"] },
    handler: createInvoice,
    requiresConfirmation: true,
  },
  {
    name: "create_service",
    description: "СЪЗДАВА нова услуга в каталога.",
    parameters: { type: "object", properties: { name: { type: "string", description: "Име на услугата" }, description: { type: "string" }, unit: { type: "string", description: "Мерна единица (бр., m², час...)" }, basePrice: { type: "number", description: "Базова цена" }, category: { type: "string", description: "Категория" } }, required: ["name"] },
    handler: createService,
    requiresConfirmation: true,
  },
  {
    name: "create_concrete_type",
    description: "СЪЗДАВА нов тип бетон в каталога.",
    parameters: { type: "object", properties: { name: { type: "string", description: "Име (B25, B30...)" }, className: { type: "string" }, pricePerM3: { type: "number", description: "Цена за m³" }, description: { type: "string" } }, required: ["name", "pricePerM3"] },
    handler: createConcreteType,
    requiresConfirmation: true,
  },
  {
    name: "create_machine",
    description: "СЪЗДАВА нова машина/помпа.",
    parameters: { type: "object", properties: { name: { type: "string", description: "Име на машината" }, type: { type: "string", enum: ["mixer", "pump", "vibrator", "truck", "bus", "car", "polisher", "other"], description: "Тип" }, plateNumber: { type: "string", description: "Рег. номер" }, notes: { type: "string" } }, required: ["name", "type"] },
    handler: createMachine,
    requiresConfirmation: true,
  },
  {
    name: "create_material",
    description: "СЪЗДАВА нов материал в склада.",
    parameters: { type: "object", properties: { name: { type: "string", description: "Име на материала" }, unit: { type: "string", description: "Мерна единица (kg, ton, m³, бр.)" }, quantity: { type: "number" }, pricePerUnit: { type: "number" } }, required: ["name", "unit"] },
    handler: createMaterial,
    requiresConfirmation: true,
  },
  {
    name: "create_worker",
    description: "СЪЗДАВА нов работник.",
    parameters: { type: "object", properties: { name: { type: "string", description: "Име на работника" }, phone: { type: "string" }, dailyRate: { type: "number", description: "Дневна ставка в лв" } }, required: ["name", "dailyRate"] },
    handler: createWorker,
    requiresConfirmation: true,
  },
  // ── ДОКУМЕНТИ ──
  {
    name: "generate_offer_pdf",
    description: "Генерира PDF на оферта. Връща линк за изтегляне.",
    parameters: { type: "object", properties: { offerId: { type: "integer" } }, required: ["offerId"] },
    handler: generateOfferPdf,
  },
  {
    name: "send_offer_email",
    description: "Изпраща оферта по имейл на клиента.",
    parameters: { type: "object", properties: { offerId: { type: "integer" }, to: { type: "string" }, message: { type: "string" } }, required: ["offerId", "to"] },
    handler: sendOfferEmail,
    requiresConfirmation: true,
  },
];

// Helper to get tools as OpenAI function calling format
export function getToolsForLLM() {
  return agentTools.map(t => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }
  }));
}

export function getTool(name: string): ToolDefinition | undefined {
  return agentTools.find(t => t.name === name);
}
