import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ========== USERS ==========
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("brigadir"), // admin | manager | brigadir | sklad
  phone: text("phone"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ========== CLIENTS ==========
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  companyName: text("company_name"),
  eik: text("eik"),
  vatNumber: text("vat_number"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ========== CONCRETE TYPES ==========
export const concreteTypes = sqliteTable("concrete_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  className: text("class_name"),
  pricePerM3: real("price_per_m3").notNull(),
  description: text("description"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

// ========== SITES ==========
export const sites = sqliteTable("sites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  address: text("address").notNull(),
  status: text("status").notNull().default("active"), // active | completed | cancelled
  startDate: text("start_date"),
  endDate: text("end_date"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ========== MACHINES ==========
export const machines = sqliteTable("machines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // mixer | pump | vibrator | other
  plateNumber: text("plate_number"),
  fuelType: text("fuel_type"),
  status: text("status").notNull().default("available"), // available | in_use | maintenance
  location: text("location"),
  lastMaintenanceDate: text("last_maintenance_date"),
  nextMaintenanceDate: text("next_maintenance_date"),
  notes: text("notes"),
});

// ========== MACHINE MAINTENANCE ==========
export const machineMaintenance = sqliteTable("machine_maintenance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  machineId: integer("machine_id").notNull().references(() => machines.id),
  date: text("date").notNull(),
  type: text("type").notNull(), // scheduled | repair | inspection
  description: text("description"),
  cost: real("cost").default(0),
  nextDate: text("next_date"),
  notes: text("notes"),
});

// ========== WORKERS ==========
export const workers = sqliteTable("workers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  dailyRate: real("daily_rate").notNull(),
  overtimeRate: real("overtime_rate"),
  status: text("status").notNull().default("active"),
  hireDate: text("hire_date"),
  notes: text("notes"),
});

// ========== WORKER ATTENDANCE ==========
export const workerAttendance = sqliteTable("worker_attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workerId: integer("worker_id").notNull().references(() => workers.id),
  date: text("date").notNull(),
  siteId: integer("site_id").references(() => sites.id),
  hours: real("hours").notNull().default(8),
  overtime: real("overtime").default(0),
  advance: real("advance").default(0),
  notes: text("notes"),
});

// ========== MATERIALS ==========
export const materials = sqliteTable("materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  unit: text("unit").notNull(), // kg | ton | m3 | бр.
  quantity: real("quantity").notNull().default(0),
  minThreshold: real("min_threshold").default(0),
  pricePerUnit: real("price_per_unit"),
  notes: text("notes"),
});

// ========== MATERIAL DELIVERIES ==========
export const materialDeliveries = sqliteTable("material_deliveries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  materialId: integer("material_id").notNull().references(() => materials.id),
  date: text("date").notNull(),
  quantity: real("quantity").notNull(),
  supplier: text("supplier"),
  price: real("price"),
  notes: text("notes"),
});

// ========== OFFERS ==========
export const offers = sqliteTable("offers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull().references(() => clients.id),
  siteId: integer("site_id").references(() => sites.id),
  number: text("number").notNull(),
  date: text("date").notNull(),
  validUntil: text("valid_until"),
  total: real("total").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft | sent | accepted | rejected
  pdfPath: text("pdf_path"),
  notes: text("notes"),
});

// ========== OFFER ITEMS ==========
export const offerItems = sqliteTable("offer_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  offerId: integer("offer_id").notNull().references(() => offers.id),
  concreteTypeId: integer("concrete_type_id").references(() => concreteTypes.id),
  serviceId: integer("service_id").references(() => services.id),
  quantityM3: real("quantity_m3").notNull(),
  pricePerM3: real("price_per_m3").notNull(),
  transportCost: real("transport_cost").default(0),
  pumpCost: real("pump_cost").default(0),
  total: real("total").notNull(),
});

// ========== POURINGS (Актове) ==========
export const pourings = sqliteTable("pourings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: integer("site_id").notNull().references(() => sites.id),
  date: text("date").notNull(),
  concreteTypeId: integer("concrete_type_id").references(() => concreteTypes.id),
  quantityM3: real("quantity_m3").notNull(),
  machineId: integer("machine_id").references(() => machines.id),
  weather: text("weather"),
  notes: text("notes"),
  actPdfPath: text("act_pdf_path"),
  status: text("status").notNull().default("completed"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ========== ACT WORKERS ==========
export const actWorkers = sqliteTable("act_workers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pouringId: integer("pouring_id").notNull().references(() => pourings.id),
  workerId: integer("worker_id").notNull().references(() => workers.id),
  hours: real("hours").notNull(),
  rate: real("rate").notNull(),
  total: real("total").notNull(),
});

// ========== ACT MATERIALS ==========
export const actMaterials = sqliteTable("act_materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pouringId: integer("pouring_id").notNull().references(() => pourings.id),
  materialId: integer("material_id").notNull().references(() => materials.id),
  quantity: real("quantity").notNull(),
});

// ========== ACT PHOTOS ==========
export const actPhotos = sqliteTable("act_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pouringId: integer("pouring_id").references(() => pourings.id),
  siteId: integer("site_id").references(() => sites.id),
  filename: text("filename").notNull(),
  caption: text("caption"),
  uploadedAt: text("uploaded_at").notNull().default(sql`(datetime('now'))`),
});

// ========== INVOICES ==========
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull().references(() => clients.id),
  supplierId: integer("supplier_id").references(() => clients.id),
  number: text("number").notNull(),
  date: text("date").notNull(),
  dueDate: text("due_date").notNull(),
  taxEventDate: text("tax_event_date").notNull(),
  direction: text("direction").notNull().default("outgoing"), // incoming | outgoing
  type: text("type").notNull().default("invoice"), // invoice | proforma | credit_note | debit_note
  currency: text("currency").notNull().default("EUR"),
  subtotal: real("subtotal").notNull().default(0),
  discountPercent: real("discount_percent").default(0),
  discountAmount: real("discount_amount").default(0),
  vatRate: real("vat_rate").notNull().default(20),
  vatAmount: real("vat_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  paymentMethod: text("payment_method").default("bank"), // bank | cash | card
  paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid | partial | paid
  relatedInvoiceId: integer("related_invoice_id"),
  taxExemptionReason: text("tax_exemption_reason"),
  status: text("status").notNull().default("draft"),
  pdfPath: text("pdf_path"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ========== INVOICE ITEMS ==========
export const invoiceItems = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  description: text("description").notNull(),
  unit: text("unit").notNull().default("бр."),
  quantity: real("quantity").notNull().default(1),
  price: real("price").notNull(),
  vatRate: real("vat_rate").notNull().default(20),
  total: real("total").notNull(),
});

// ========== SITE CALENDAR ==========
export const siteCalendar = sqliteTable("site_calendar", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: integer("site_id").notNull().references(() => sites.id),
  plannedDate: text("planned_date").notNull(),
  concreteTypeId: integer("concrete_type_id").references(() => concreteTypes.id),
  estimatedM3: real("estimated_m3"),
  machineId: integer("machine_id").references(() => machines.id),
  teamLeadId: integer("team_lead_id").references(() => workers.id),
  status: text("status").notNull().default("planned"), // planned | confirmed | done | postponed
  notes: text("notes"),
});

// ========== TEMPLATES ==========
export const templates = sqliteTable("templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // offer | contract | act | invoice | protocol
  content: text("content").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ========== SERVICES ==========
export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("other"),
  unit: text("unit").notNull().default("бр."),
  basePrice: real("base_price").default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const serviceItems = sqliteTable("service_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceId: integer("service_id").notNull().references(() => services.id),
  concreteTypeId: integer("concrete_type_id").references(() => concreteTypes.id),
  materialId: integer("material_id").references(() => materials.id),
  actionName: text("action_name"),
  quantity: real("quantity").notNull().default(1),
  unit: text("unit").notNull().default("бр."),
  pricePerUnit: real("price_per_unit").default(0),
  sortOrder: integer("sort_order").default(0),
});

// ========== AUDIT LOG ==========
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // create | update | delete | login
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  changes: text("changes"), // JSON
  timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
});

// ========== API KEYS ==========
export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ========== COMPANY SETTINGS ==========
export const companySettings = sqliteTable("company_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull().default(""),
  companyNameBG: text("company_name_bg").notNull().default(""),
  eik: text("eik").notNull().default(""),
  vatNumber: text("vat_number").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  mol: text("mol").notNull().default(""),
  bankName: text("bank_name").notNull().default(""),
  iban: text("iban").notNull().default(""),
  bic: text("bic").notNull().default(""),
  logoPath: text("logo_path"),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});
