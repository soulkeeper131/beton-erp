import { describe, it, expect } from "vitest";
import { calcPay, attendanceSchema, workerSchema } from "@/lib/payroll";

describe("ведомост", () => {
  it("8 часа при 120 €/ден = 120 €, не 960 €", () => {
    expect(calcPay({ hours: 8, overtime: 0, advance: 0, dailyRate: 120 }).gross).toBe(120);
  });
  it("месец: 22 дни × 8 ч, 10 извънредни по 20 €/ч, аванс 300", () => {
    const r = calcPay({ hours: 176, overtime: 10, advance: 300, dailyRate: 100, overtimeRate: 20 });
    expect(r.days).toBe(22);
    expect(r.base).toBe(2200);
    expect(r.overtimePay).toBe(200);
    expect(r.net).toBe(2100);
  });
  it("без ставка за извънредни — часовата × 1.5", () => {
    expect(calcPay({ hours: 0, overtime: 2, advance: 0, dailyRate: 80 }).overtimePay).toBe(30);
  });
});

describe("валидация", () => {
  it("явка над 24 часа се отказва", () => {
    expect(attendanceSchema.safeParse({ workerId: 1, date: "2026-09-26", hours: 25 }).success).toBe(false);
  });
  it("работник: празна ставка за извънредни → null; нулева дневна ставка се отказва", () => {
    expect(workerSchema.parse({ name: "Петър", dailyRate: "120", overtimeRate: "" }).overtimeRate).toBeNull();
    expect(workerSchema.safeParse({ name: "Петър", dailyRate: 0 }).success).toBe(false);
  });
});
