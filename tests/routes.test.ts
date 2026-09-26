import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import path from "path";

function findRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findRouteFiles(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

describe("API routes force-dynamic (SQLITE_BUSY guard)", () => {
  it("всеки route с DB import има 'force-dynamic'", () => {
    const apiDir = path.resolve("src/app/api");
    const routes = findRouteFiles(apiDir);
    const missing: string[] = [];
    for (const r of routes) {
      const content = readFileSync(r, "utf8");
      if (content.includes("@/db") || content.includes("@db")) {
        if (!content.includes("force-dynamic")) missing.push(path.relative(apiDir, r));
      }
    }
    expect(missing, `липсва force-dynamic на: ${missing.join(", ")}`).toEqual([]);
  });

  it("има поне 50 API routes (покритие)", () => {
    const routes = findRouteFiles(path.resolve("src/app/api"));
    expect(routes.length).toBeGreaterThanOrEqual(50);
  });
});

describe("API routes auth guard", () => {
  // Публични по замисъл или със собствена проверка на API ключ
  const PUBLIC = ["auth/[...nextauth]/route.ts", "health/route.ts", "tools/call/route.ts"];

  it("всеки handler проверява сесия/API ключ", () => {
    const apiDir = path.resolve("src/app/api");
    const missing: string[] = [];
    for (const r of findRouteFiles(apiDir)) {
      const rel = path.relative(apiDir, r).split(path.sep).join("/");
      if (PUBLIC.includes(rel)) continue;
      const content = readFileSync(r, "utf8");
      // Проверката трябва да е във всеки handler, не само някъде във файла
      const handlers = content.split(/(?=export async function (?:GET|POST|PUT|PATCH|DELETE)\b)/).slice(1);
      for (const h of handlers) {
        const name = h.match(/export async function (\w+)/)![1];
        if (!/requireAuth\(|getAuth\(|requireAdmin\(|auth\(\)/.test(h.slice(0, 1500))) missing.push(`${rel} ${name}`);
      }
    }
    expect(missing, `без auth проверка: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("drizzle заявки се изпълняват", () => {
  // db.update(...).where(...) без .run()/.all()/.get() и без await не прави нищо —
  // така паролата не се сменяше и периодичните фактури се дублираха.
  function findSourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...findSourceFiles(full));
      else if (/\.tsx?$/.test(e.name)) out.push(full);
    }
    return out;
  }

  it("няма insert/update/delete без .run()/.all()/.get()/await", () => {
    const bad: string[] = [];
    for (const f of findSourceFiles(path.resolve("src"))) {
      const s = readFileSync(f, "utf8");
      const re = /(^|[^\w.])(await\s+)?((?:db|tx)\s*\.\s*(?:insert|update|delete)\b)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s))) {
        if (m[2]) continue;
        const before = s.slice(Math.max(0, m.index - 30), m.index + m[1].length);
        if (/(=|return|await|=>)\s*$/.test(before)) continue; // резултатът се ползва/връща
        let depth = 0, i = m.index + m[0].length - m[3].length;
        const start = i;
        for (; i < s.length; i++) {
          const c = s[i];
          if ("([{".includes(c)) depth++;
          else if (")]}".includes(c)) { if (--depth < 0) break; }
          else if (c === ";" && depth === 0) break;
        }
        const stmt = s.slice(start, i);
        if (!/\.(run|all|get)\(\)/.test(stmt)) bad.push(`${path.relative(".", f)}:${s.slice(0, start).split("\n").length}`);
      }
    }
    expect(bad, `неизпълнени заявки: ${bad.join(", ")}`).toEqual([]);
  });
});
