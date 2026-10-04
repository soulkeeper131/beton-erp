import { describe, it, expect } from "vitest";
import { weightedAverageCost, remainingAfter, stockValue } from "@/lib/stock";
import { attendanceFromActs, payrollSummary } from "@/lib/payroll";

describe("склад", () => {
  it("средна претеглена цена при приход", () => {
    // 100 кг по 2 € + 100 кг по 3 € → 2.5 €
    expect(weightedAverageCost(100, 2, 100, 3)).toBe(2.5);
    expect(weightedAverageCost(0, 2, 50, 3)).toBe(3); // празен склад → новата цена
    expect(weightedAverageCost(10, null, 5, 4)).toBe(4); // без стара цена
    expect(weightedAverageCost(10, 2, 5, null)).toBe(2); // приход без цена не я мени
    expect(weightedAverageCost(-5, 2, 10, 3)).toBe(3); // отрицателна наличност → новата
  });
  it("наличност след разход и стойност", () => {
    expect(remainingAfter(10, 10)).toBe(0);
    expect(remainingAfter(0.3, 0.1 + 0.2)).toBe(0);
    expect(remainingAfter(5, 6)).toBe(-1);
    expect(stockValue(-3, 2)).toBe(0);
    expect(stockValue(12.5, 1.2)).toBe(15);
  });
});

describe("заплати", () => {
  it("ведомост: всяка явка със своята ставка", () => {
    const s = payrollSummary([
      { workerId: 1, workerName: "Иван", hours: 8, overtime: 0, advance: 0, dailyRate: 160, overtimeRate: null },
      // ставката е вдигната от 160 на 200 — минали дни остават по 160
      { workerId: 1, workerName: "Иван", hours: 8, overtime: 2, advance: 50, dailyRate: 200, overtimeRate: 30 },
    ]);
    expect(s).toEqual([{ workerId: 1, name: "Иван", days: 2, hours: 16, overtime: 2, base: 360, overtimePay: 60, advance: 50, gross: 420, net: 370 }]);
  });
  it("явки от актовете: сумира деня, над 8 ч → извънредни, обект с най-много часове", () => {
    const a = attendanceFromActs([
      { workerId: 1, date: "2026-10-01", siteId: 5, hours: 6 },
      { workerId: 1, date: "2026-10-01", siteId: 7, hours: 4 },
      { workerId: 2, date: "2026-10-01", siteId: 5, hours: 3 },
    ]);
    expect(a).toEqual([
      { workerId: 1, date: "2026-10-01", siteId: 5, hours: 8, overtime: 2 },
      { workerId: 2, date: "2026-10-01", siteId: 5, hours: 3, overtime: 0 },
    ]);
  });
});
