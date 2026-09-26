import { describe, it, expect } from "vitest";
import { parsePeriod, inPeriod, invoiceSign, toCsv } from "@/lib/reports";
import { isBrigadirApiBlocked, isBrigadirPageAllowed } from "@/lib/roles";

describe("parsePeriod", () => {
  it("празни стойности = без граница", () => {
    expect(parsePeriod(null, null)).toEqual({ from: null, to: null });
    expect(parsePeriod("", " ")).toEqual({ from: null, to: null });
  });
  it("валиден период", () => {
    expect(parsePeriod("2026-09-01", "2026-09-30")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });
  it("невалиден формат или from > to → null", () => {
    expect(parsePeriod("01.09.2026", null)).toBeNull();
    expect(parsePeriod("2026-10-01", "2026-09-01")).toBeNull();
  });
});

describe("inPeriod", () => {
  const sept = { from: "2026-09-01", to: "2026-09-30" };
  it("границите са включително", () => {
    expect(inPeriod("2026-09-01", sept)).toBe(true);
    expect(inPeriod("2026-09-30", sept)).toBe(true);
    expect(inPeriod("2026-10-01", sept)).toBe(false);
  });
  it("дата с час", () => {
    expect(inPeriod("2026-09-30 18:45:00", sept)).toBe(true);
  });
  it("без период всичко минава, с период липсваща дата не минава", () => {
    expect(inPeriod(null, { from: null, to: null })).toBe(true);
    expect(inPeriod(null, sept)).toBe(false);
  });
});

describe("invoiceSign", () => {
  it("проформа 0, кредитно −1, останалите +1", () => {
    expect(invoiceSign("proforma")).toBe(0);
    expect(invoiceSign("credit_note")).toBe(-1);
    expect(invoiceSign("invoice")).toBe(1);
    expect(invoiceSign("debit_note")).toBe(1);
  });
});

describe("toCsv", () => {
  it("BOM, ; разделител, десетична запетая, кавички при нужда", () => {
    const csv = toCsv(["Име", "Сума"], [["Строй; ООД", 12.5], ['Кав"ка', null]]);
    expect(csv).toBe('﻿Име;Сума\r\n"Строй; ООД";12,5\r\n"Кав""ка";');
  });
});

describe("права на бригадира", () => {
  it("страници", () => {
    expect(isBrigadirPageAllowed("/")).toBe(true);
    expect(isBrigadirPageAllowed("/sites/5")).toBe(true);
    expect(isBrigadirPageAllowed("/reports")).toBe(false);
    expect(isBrigadirPageAllowed("/invoices/new")).toBe(false);
    expect(isBrigadirPageAllowed("/sitesX")).toBe(false);
  });
  it("API", () => {
    expect(isBrigadirApiBlocked("/api/reports")).toBe(true);
    expect(isBrigadirApiBlocked("/api/invoices/12")).toBe(true);
    expect(isBrigadirApiBlocked("/api/pourings")).toBe(false);
    expect(isBrigadirApiBlocked("/api/sites/map")).toBe(false);
  });
});
