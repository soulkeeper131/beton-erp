import { describe, it, expect } from "vitest";
import {
  calcInvoiceTotals,
  roundMoney,
  nextRecurringDate,
  nextInvoiceNumber,
  formatEuro,
  addDays,
  addMonths,
} from "@/lib/calc";

describe("calcInvoiceTotals (ДДС/валута)", () => {
  it("изчислява проста фактура без отстъпка (20% ДДС)", () => {
    const { subtotal, vatAmount, total } = calcInvoiceTotals([
      { quantity: 10, price: 170, vatRate: 20 },
    ]);
    expect(subtotal).toBe(1700);
    expect(vatAmount).toBeCloseTo(340);
    expect(total).toBeCloseTo(2040);
  });

  it("начислява ДДС върху данъчната основа (след отстъпка)", () => {
    // 1000 бруто, 10% отстъпка → база 900, ДДС 180
    const { subtotal, vatAmount, total } = calcInvoiceTotals(
      [{ quantity: 1, price: 1000, vatRate: 20 }],
      10,
      0,
    );
    expect(subtotal).toBe(1000);
    expect(vatAmount).toBeCloseTo(180);
    expect(total).toBeCloseTo(1080);
  });

  it("обработва смесени ДДС ставки (пропорционална ефективна ставка)", () => {
    // ред A: 100 € на 20% (20 ДДС), ред B: 100 € на 9% (9 ДДС)
    const { subtotal, vatAmount, total } = calcInvoiceTotals([
      { quantity: 1, price: 100, vatRate: 20 },
      { quantity: 1, price: 100, vatRate: 9 },
    ]);
    expect(subtotal).toBe(200);
    expect(vatAmount).toBeCloseTo(29);
    expect(total).toBeCloseTo(229);
  });

  it("връща 0 за празен списък", () => {
    const r = calcInvoiceTotals([]);
    expect(r.subtotal).toBe(0);
    expect(r.vatAmount).toBe(0);
    expect(r.total).toBe(0);
  });

  it("смесва процентна и фиксирана отстъпка", () => {
    // 1000 бруто, 10% + 50 фиксирано → база 850, ДДС 170
    const { vatAmount, total } = calcInvoiceTotals(
      [{ quantity: 1, price: 1000, vatRate: 20 }],
      10,
      50,
    );
    expect(vatAmount).toBeCloseTo(170);
    expect(total).toBeCloseTo(1020);
  });
});

describe("nextRecurringDate", () => {
  it("месечно добавя 1 месец", () => {
    expect(nextRecurringDate("2026-01-15", "monthly")).toBe("2026-02-15");
  });
  it("седмично добавя 7 дни", () => {
    expect(nextRecurringDate("2026-01-15", "weekly")).toBe("2026-01-22");
  });
  it("през границата на годината (месечно)", () => {
    expect(nextRecurringDate("2026-12-15", "monthly")).toBe("2027-01-15");
  });
});

describe("nextInvoiceNumber", () => {
  it("изходящите започват от Inv-1000000001, входящите от ВХ-000001", () => {
    expect(nextInvoiceNumber("outgoing", [])).toBe("Inv-1000000001");
    expect(nextInvoiceNumber("incoming", [])).toBe("ВХ-000001");
  });
  it("старите ИЗХ- номера не влияят на новата серия", () => {
    expect(nextInvoiceNumber("outgoing", ["ИЗХ-000057", "ИЗХ-000003"])).toBe("Inv-1000000001");
  });
  it("ползва MAX, не count (без колизии при изтриване)", () => {
    expect(nextInvoiceNumber("outgoing", ["Inv-1000000003", "Inv-1000000001", "ИЗХ-000999"])).toBe("Inv-1000000004");
    expect(nextInvoiceNumber("incoming", ["ВХ-000003", "ВХ-000001"])).toBe("ВХ-000004");
  });
  it("номерът е точно 10 цифри след префикса", () => {
    expect(nextInvoiceNumber("outgoing", ["Inv-1000000009"])).toMatch(/^Inv-\d{10}$/);
  });
});

describe("formatEuro", () => {
  it("форматира в евро (символ € + десетична запетая)", () => {
    const s = formatEuro(1234.56);
    expect(s).toContain("€");
    expect(s).toContain("1234,56");
  });
  it("отрицателни стойности", () => {
    expect(formatEuro(-500)).toContain("500");
  });
});

describe("addDays/addMonths", () => {
  it("addDays", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });
  it("addMonths clamp-ва към последния ден на месеца", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
  });
});

describe("ДДС по ставки", () => {
  it("разбивка при смесени ставки, с отстъпка", () => {
    const r = calcInvoiceTotals([
      { quantity: 1, price: 1000, vatRate: 20 },
      { quantity: 1, price: 500, vatRate: 9 },
      { quantity: 1, price: 100, vatRate: 0 },
    ], 10);
    expect(r.byRate).toEqual([
      { rate: 20, base: 900, vat: 180 },
      { rate: 9, base: 450, vat: 40.5 },
      { rate: 0, base: 90, vat: 0 },
    ]);
    expect(r.vatAmount).toBe(220.5);
    expect(r.total).toBe(1660.5);
  });
});

describe("закръгляне до стотинка", () => {
  it("roundMoney", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(-2.345)).toBe(-2.34);
  });
  it("сумите на фактурата са точни стотинки и общо = основа + ДДС", () => {
    const r = calcInvoiceTotals([{ quantity: 3, price: 33.33, vatRate: 20 }, { quantity: 0.7, price: 12.1, vatRate: 9 }]);
    for (const v of [r.subtotal, r.netBase, r.vatAmount, r.total]) expect(Math.round(v * 100) / 100).toBe(v);
    expect(r.total).toBe(roundMoney(r.netBase + r.vatAmount));
  });
  it("0% ДДС не става 20%", () => {
    const r = calcInvoiceTotals([{ quantity: 1, price: 100, vatRate: 0 }]);
    expect(r.vatAmount).toBe(0);
    expect(r.total).toBe(100);
  });
});

import { addDays as dAddDays, addMonths as dAddMonths, monthEnd, sofiaDate, daysUntil, today } from "@/lib/dates";

describe("dates (часова зона)", () => {
  it("днес е по София, не по UTC", () => {
    // 30.09 22:30 UTC = 01.10 01:30 в София
    expect(sofiaDate(new Date("2026-09-30T22:30:00Z"))).toBe("2026-10-01");
    // зимно време: 31.12 22:30 UTC = 01.01 00:30
    expect(sofiaDate(new Date("2026-12-31T22:30:00Z"))).toBe("2027-01-01");
    expect(sofiaDate(new Date("2026-12-31T21:30:00Z"))).toBe("2026-12-31");
  });

  it("аритметика с дати не зависи от зоната на процеса", () => {
    expect(dAddDays("2026-03-28", 1)).toBe("2026-03-29"); // преминаване към лятно време
    expect(dAddDays("2026-10-24", 2)).toBe("2026-10-26"); // към зимно
    expect(dAddMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(dAddMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(monthEnd(2026, 2)).toBe("2026-02-28");
    expect(monthEnd(2026, 12)).toBe("2026-12-31");
  });

  it("daysUntil", () => {
    expect(daysUntil(today())).toBe(0);
    expect(daysUntil(dAddDays(today(), 5))).toBe(5);
    expect(daysUntil(dAddDays(today(), -1))).toBe(-1);
  });
});
