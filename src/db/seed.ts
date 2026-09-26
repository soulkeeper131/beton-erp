import { db } from "./index";
import { users, concreteTypes } from "./schema";
import { hash } from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminHash = await hash("admin123", 10);
  await db.insert(users).values({
    email: "admin@beton.bg",
    passwordHash: adminHash,
    name: "Администратор",
    role: "admin",
  }).onConflictDoNothing();

  // Manager
  const managerHash = await hash("manager123", 10);
  await db.insert(users).values({
    email: "manager@beton.bg",
    passwordHash: managerHash,
    name: "Мениджър",
    role: "manager",
  }).onConflictDoNothing();

  // Brigadir
  const brigadirHash = await hash("brigadir123", 10);
  await db.insert(users).values({
    email: "brigadir@beton.bg",
    passwordHash: brigadirHash,
    name: "Бригадир Иван",
    role: "brigadir",
  }).onConflictDoNothing();

  // Concrete types
  const types = [
    { name: "B10", className: "B10", pricePerM3: 140, description: "Лека основа" },
    { name: "B15", className: "B15", pricePerM3: 155, description: "Основи, настилки" },
    { name: "B20", className: "B20", pricePerM3: 170, description: "Плочи, греди" },
    { name: "B25", className: "B25", pricePerM3: 185, description: "Колони, шайби" },
    { name: "B30", className: "B30", pricePerM3: 200, description: "Мостове, конструкции" },
    { name: "Транспортбетон", className: "TRANSP", pricePerM3: 160, description: "Готов за изливане" },
    { name: "Замазка", className: "SCREED", pricePerM3: 130, description: "Подова замазка" },
  ];

  // Без дубли: базата вече може да има типовете (auto-seed в db/index.ts при първо
  // пускане), а таблицата няма UNIQUE — onConflictDoNothing не пази.
  const existing = new Set(db.select({ name: concreteTypes.name }).from(concreteTypes).all().map((t) => t.name));
  for (const t of types) {
    if (!existing.has(t.name)) await db.insert(concreteTypes).values(t);
  }

  console.log("✅ Seed complete: 3 users, 7 concrete types");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
