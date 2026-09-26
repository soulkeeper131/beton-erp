import { describe, it, expect } from "vitest";
import { actCreateSchema, actPatchSchema, firstZodError, materialStockDelta, hourlyFromDaily } from "@/lib/acts";

describe("materialStockDelta", () => {
  it("нов акт изписва всичко", () => {
    expect([...materialStockDelta([], [{ materialId: 1, quantity: 100 }])]).toEqual([[1, 100]]);
  });
  it("промяна изписва само разликата, изтриване връща", () => {
    const before = [{ materialId: 1, quantity: 100 }, { materialId: 2, quantity: 5 }];
    const d = materialStockDelta(before, [{ materialId: 1, quantity: 60 }]);
    expect(d.get(1)).toBe(-40);
    expect(d.get(2)).toBe(-5);
  });
  it("без промяна — празно; повтарящ се материал се сумира", () => {
    expect(materialStockDelta([{ materialId: 1, quantity: 10 }], [{ materialId: 1, quantity: 10 }]).size).toBe(0);
    expect(materialStockDelta([], [{ materialId: 1, quantity: 2 }, { materialId: 1, quantity: 3 }]).get(1)).toBe(5);
  });
});

describe("валидация на акт", () => {
  const ok = { siteId: 1, date: "2026-09-26", items: [{ concreteTypeId: 3, quantityM3: 10, pricePerM3: 160 }] };
  it("валиден акт", () => expect(actCreateSchema.safeParse(ok).success).toBe(true));
  it("отрицателно количество → разбираема грешка", () => {
    const r = actCreateSchema.safeParse({ ...ok, items: [{ concreteTypeId: 3, quantityM3: -1, pricePerM3: 1 }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstZodError(r.error)).toBe("Ред 1: Количеството трябва да е > 0");
  });
  it("работник без избор → грешка на български", () => {
    const r = actPatchSchema.safeParse({ workers: [{ workerId: "", hours: 8, rate: 15 }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstZodError(r.error)).toMatch(/^Работник 1: /);
  });
});

describe("hourlyFromDaily", () => {
  it("дневна ÷ 8, закръглено", () => {
    expect(hourlyFromDaily(120)).toBe(15);
    expect(hourlyFromDaily(100)).toBe(12.5);
    expect(hourlyFromDaily(null)).toBe(0);
  });
});
