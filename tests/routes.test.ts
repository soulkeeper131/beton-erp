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

  it("всеки route проверява сесия/API ключ в handler-а", () => {
    const apiDir = path.resolve("src/app/api");
    const missing: string[] = [];
    for (const r of findRouteFiles(apiDir)) {
      const rel = path.relative(apiDir, r).split(path.sep).join("/");
      if (PUBLIC.includes(rel)) continue;
      const content = readFileSync(r, "utf8");
      if (!/requireAuth\(|getAuth\(|requireAdmin\(|auth\(\)/.test(content)) missing.push(rel);
    }
    expect(missing, `без auth проверка: ${missing.join(", ")}`).toEqual([]);
  });
});
