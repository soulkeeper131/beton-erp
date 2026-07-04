import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import * as schema from './schema';

const sqlite = new Database('./data/sqlite.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Auto-create tables on first run
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    phone TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company_name TEXT,
    eik TEXT,
    vat_number TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS concrete_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    class_name TEXT,
    price_per_m3 REAL NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    start_date TEXT,
    end_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    plate_number TEXT,
    fuel_type TEXT,
    status TEXT NOT NULL DEFAULT 'available',
    location TEXT,
    last_maintenance_date TEXT,
    next_maintenance_date TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS machine_maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL REFERENCES machines(id),
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    cost REAL DEFAULT 0,
    next_date TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    daily_rate REAL NOT NULL,
    overtime_rate REAL,
    status TEXT NOT NULL DEFAULT 'active',
    hire_date TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS worker_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id INTEGER NOT NULL REFERENCES workers(id),
    date TEXT NOT NULL,
    site_id INTEGER REFERENCES sites(id),
    hours REAL NOT NULL DEFAULT 8,
    overtime REAL DEFAULT 0,
    advance REAL DEFAULT 0,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    min_threshold REAL DEFAULT 0,
    price_per_unit REAL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS material_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    date TEXT NOT NULL,
    quantity REAL NOT NULL,
    supplier TEXT,
    price REAL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    site_id INTEGER REFERENCES sites(id),
    number TEXT NOT NULL,
    date TEXT NOT NULL,
    valid_until TEXT,
    total REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    pdf_path TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS offer_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id INTEGER NOT NULL REFERENCES offers(id),
    concrete_type_id INTEGER REFERENCES concrete_types(id),
    service_id INTEGER REFERENCES services(id),
    quantity_m3 REAL NOT NULL,
    price_per_m3 REAL NOT NULL,
    transport_cost REAL DEFAULT 0,
    pump_cost REAL DEFAULT 0,
    total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pourings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    date TEXT NOT NULL,
    concrete_type_id INTEGER REFERENCES concrete_types(id),
    quantity_m3 REAL NOT NULL,
    machine_id INTEGER REFERENCES machines(id),
    weather TEXT,
    notes TEXT,
    act_pdf_path TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS act_workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pouring_id INTEGER NOT NULL REFERENCES pourings(id),
    worker_id INTEGER NOT NULL REFERENCES workers(id),
    hours REAL NOT NULL,
    rate REAL NOT NULL,
    total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS act_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pouring_id INTEGER NOT NULL REFERENCES pourings(id),
    material_id INTEGER NOT NULL REFERENCES materials(id),
    quantity REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS act_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pouring_id INTEGER REFERENCES pourings(id),
    site_id INTEGER REFERENCES sites(id),
    filename TEXT NOT NULL,
    caption TEXT,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    supplier_id INTEGER REFERENCES clients(id),
    number TEXT NOT NULL,
    date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    tax_event_date TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'outgoing',
    type TEXT NOT NULL DEFAULT 'invoice',
    currency TEXT NOT NULL DEFAULT 'EUR',
    subtotal REAL NOT NULL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    vat_rate REAL NOT NULL DEFAULT 20,
    vat_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'bank',
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    related_invoice_id INTEGER REFERENCES invoices(id),
    tax_exemption_reason TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    pdf_path TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    description TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'бр.',
    quantity REAL NOT NULL DEFAULT 1,
    price REAL NOT NULL,
    vat_rate REAL NOT NULL DEFAULT 20,
    total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_calendar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    planned_date TEXT NOT NULL,
    concrete_type_id INTEGER REFERENCES concrete_types(id),
    estimated_m3 REAL,
    machine_id INTEGER REFERENCES machines(id),
    team_lead_id INTEGER REFERENCES workers(id),
    status TEXT NOT NULL DEFAULT 'planned',
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    changes TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'other',
    unit TEXT NOT NULL DEFAULT 'бр.',
    base_price REAL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS service_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL REFERENCES services(id),
    concrete_type_id INTEGER REFERENCES concrete_types(id),
    material_id INTEGER REFERENCES materials(id),
    action_name TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'бр.',
    price_per_unit REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS company_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL DEFAULT '',
    company_name_bg TEXT NOT NULL DEFAULT '',
    eik TEXT NOT NULL DEFAULT '',
    vat_number TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    mol TEXT NOT NULL DEFAULT '',
    bank_name TEXT NOT NULL DEFAULT '',
    iban TEXT NOT NULL DEFAULT '',
    bic TEXT NOT NULL DEFAULT '',
    logo_path TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: add city column to sites (safe to run multiple times)
try { sqlite.exec('ALTER TABLE sites ADD COLUMN city TEXT NOT NULL DEFAULT ""'); } catch (e: any) { if (!e.message.includes('duplicate')) console.log('city column already exists'); }
try { sqlite.exec('ALTER TABLE offer_items ADD COLUMN service_id INTEGER REFERENCES services(id)'); } catch (e: any) { if (!e.message.includes('duplicate')) console.log('service_id column already exists'); }

// Migration: invoice overhaul
const invoiceCols = [
  'ALTER TABLE invoices ADD COLUMN supplier_id INTEGER REFERENCES clients(id)',
  'ALTER TABLE invoices ADD COLUMN tax_event_date TEXT NOT NULL DEFAULT ""',
  'ALTER TABLE invoices ADD COLUMN direction TEXT NOT NULL DEFAULT "outgoing"',
  'ALTER TABLE invoices ADD COLUMN currency TEXT NOT NULL DEFAULT "EUR"',
  'ALTER TABLE invoices ADD COLUMN subtotal REAL NOT NULL DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN discount_percent REAL DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN discount_amount REAL DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN payment_method TEXT DEFAULT "bank"',
  'ALTER TABLE invoices ADD COLUMN payment_status TEXT NOT NULL DEFAULT "unpaid"',
  'ALTER TABLE invoices ADD COLUMN related_invoice_id INTEGER REFERENCES invoices(id)',
  'ALTER TABLE invoices ADD COLUMN tax_exemption_reason TEXT',
  'ALTER TABLE invoices ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime("now"))',
  'ALTER TABLE invoices ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime("now"))',
  'ALTER TABLE invoice_items ADD COLUMN vat_rate REAL NOT NULL DEFAULT 20',
];
for (const sql of invoiceCols) {
  try { sqlite.exec(sql); } catch(e: any) {
    if (!e.message.includes('duplicate')) console.error('Invoice migration failed:', sql.substring(0, 80), e.message);
  }
}

// Migration: add GPS location to act_photos
try { sqlite.exec('ALTER TABLE act_photos ADD COLUMN latitude REAL'); } catch (e: any) { if (!e.message.includes('duplicate')) console.error('lat migration:', e.message); }
try { sqlite.exec('ALTER TABLE act_photos ADD COLUMN longitude REAL'); } catch (e: any) { if (!e.message.includes('duplicate')) console.error('lng migration:', e.message); }

// Seed company settings if empty
const settingsCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM company_settings').get() as { cnt: number };
if (settingsCount.cnt === 0) {
  sqlite.prepare('INSERT INTO company_settings (company_name, company_name_bg, eik, vat_number, address, city, phone, email, mol, bank_name, iban, bic) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
    '', '', '', '', '', '', '', '', '', '', '', ''
  );
}

console.log("✅ Database tables ensured");

// Auto-seed on first run
const userCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
if (userCount.cnt === 0) {
  console.log("🌱 Seeding database...");
  
  const seedUsers = [
    { email: "admin@beton.bg", name: "Администратор", role: "admin", password: "admin123" },
    { email: "employee@beton.bg", name: "Служител", role: "employee", password: "employee123" },
  ];
  
  const insertUser = sqlite.prepare(
    'INSERT OR IGNORE INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
  );
  
  for (const u of seedUsers) {
    const h = bcrypt.hashSync(u.password, 10);
    insertUser.run(u.email, h, u.name, u.role);
  }
  
  const types = [
    ["B10", "B10", 140, "Лека основа"],
    ["B15", "B15", 155, "Основи, настилки"],
    ["B20", "B20", 170, "Плочи, греди"],
    ["B25", "B25", 185, "Колони, шайби"],
    ["B30", "B30", 200, "Мостове, конструкции"],
    ["Транспортбетон", "TRANSP", 160, "Готов за изливане"],
    ["Замазка", "SCREED", 130, "Подова замазка"],
  ];
  
  const insertType = sqlite.prepare(
    'INSERT OR IGNORE INTO concrete_types (name, class_name, price_per_m3, description) VALUES (?, ?, ?, ?)'
  );
  
  for (const t of types) {
    insertType.run(t[0], t[1], t[2], t[3]);
  }
  
  console.log("✅ Seed complete: 2 users, 7 concrete types");
}

export const db = drizzle(sqlite, { schema });

// Migration: machines overhaul — vehicle fleet management
const machineCols = [
  'ALTER TABLE machines ADD COLUMN category TEXT NOT NULL DEFAULT "other"',
  'ALTER TABLE machines ADD COLUMN year TEXT',
  'ALTER TABLE machines ADD COLUMN vin TEXT',
  'ALTER TABLE machines ADD COLUMN mileage INTEGER DEFAULT 0',
  'ALTER TABLE machines ADD COLUMN vignette_expiry TEXT',
  'ALTER TABLE machines ADD COLUMN insurance_expiry TEXT',
  'ALTER TABLE machines ADD COLUMN tech_inspection_expiry TEXT',
  'ALTER TABLE machine_maintenance ADD COLUMN provider TEXT',
  'ALTER TABLE machine_maintenance ADD COLUMN document_path TEXT',
  'ALTER TABLE machine_maintenance ADD COLUMN mileage_at_repair INTEGER',
];
for (const sql of machineCols) {
  try { sqlite.exec(sql); } catch(e: any) { if (!e.message.includes('duplicate')) {} }
}

// Migration: SMTP settings
const smtpCols = [
  'ALTER TABLE company_settings ADD COLUMN smtp_host TEXT NOT NULL DEFAULT ""',
  'ALTER TABLE company_settings ADD COLUMN smtp_port INTEGER NOT NULL DEFAULT 587',
  'ALTER TABLE company_settings ADD COLUMN smtp_user TEXT NOT NULL DEFAULT ""',
  'ALTER TABLE company_settings ADD COLUMN smtp_pass TEXT NOT NULL DEFAULT ""',
  'ALTER TABLE company_settings ADD COLUMN smtp_from TEXT NOT NULL DEFAULT ""',
  'ALTER TABLE company_settings ADD COLUMN smtp_secure INTEGER NOT NULL DEFAULT 0',
];
for (const sql of smtpCols) {
  try { sqlite.exec(sql); } catch(e: any) { if (!e.message.includes('duplicate')) {} }
}

// Migration: IMAP settings
const imapCols = [
  'ALTER TABLE company_settings ADD COLUMN imap_host TEXT NOT NULL DEFAULT ""',
  'ALTER TABLE company_settings ADD COLUMN imap_port INTEGER NOT NULL DEFAULT 993',
  'ALTER TABLE company_settings ADD COLUMN imap_user TEXT NOT NULL DEFAULT ""',
  'ALTER TABLE company_settings ADD COLUMN imap_pass TEXT NOT NULL DEFAULT ""',
  'ALTER TABLE company_settings ADD COLUMN imap_tls INTEGER NOT NULL DEFAULT 1',
  'ALTER TABLE company_settings ADD COLUMN incoming_email_folder TEXT NOT NULL DEFAULT "INBOX"',
];
for (const sql of imapCols) {
  try { sqlite.exec(sql); } catch(e: any) { if (!e.message.includes('duplicate')) {} }
}

// Migration: accent color
try { sqlite.exec('ALTER TABLE company_settings ADD COLUMN accent_color TEXT NOT NULL DEFAULT "#f97316"'); } catch(e: any) { if (!e.message.includes('duplicate')) {} }
