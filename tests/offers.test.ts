import { describe, it, expect } from "vitest";
import { offerItemSchema, offerItemTotal, offerTotal } from "@/lib/offers";

describe("оферти — суми", () => {
  it("ред = к-во × цена + транспорт + помпа, закръглено", () => {
    expect(offerItemTotal({ quantityM3: 10, pricePerM3: 150.555, transportCost: 50 })).toBe(1555.55);
    expect(offerItemTotal({ quantityM3: 1, pricePerM3: 100, pumpCost: null, transportCost: null })).toBe(100);
  });
  it("обща сума = сбор от редовете", () => {
    expect(offerTotal([{ quantityM3: 0.1, pricePerM3: 0.2 }, { quantityM3: 1, pricePerM3: 0.1 }])).toBe(0.12);
    expect(offerTotal([])).toBe(0);
  });
});

describe("оферти — валидация на ред", () => {
  it("иска тип бетон или услуга", () => {
    expect(offerItemSchema.safeParse({ quantityM3: 1, pricePerM3: 1 }).success).toBe(false);
    expect(offerItemSchema.safeParse({ serviceId: 2, quantityM3: 1, pricePerM3: 1 }).success).toBe(true);
  });
  it("отказва неположително количество", () => {
    expect(offerItemSchema.safeParse({ concreteTypeId: 3, quantityM3: 0, pricePerM3: 1 }).success).toBe(false);
  });
});
