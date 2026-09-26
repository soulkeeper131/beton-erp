import { describe, it, expect } from "vitest";
import { machineSchema, repairSchema } from "@/lib/machines";
import { firstZodError } from "@/lib/acts";

describe("машини — валидация", () => {
  it("празни полета от формата стават null", () => {
    const r = machineSchema.parse({ name: "Помпа", type: "pump", plateNumber: "", vignetteExpiry: "", mileage: "1200" });
    expect(r.plateNumber).toBeNull();
    expect(r.vignetteExpiry).toBeNull();
    expect(r.mileage).toBe(1200);
    expect(r.category).toBe("other");
  });
  it("липсващо име → съобщение на български", () => {
    const r = machineSchema.safeParse({ type: "pump" });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstZodError(r.error)).toBe("Името е задължително");
  });
  it("ремонт изисква описание и валидна дата", () => {
    expect(repairSchema.safeParse({ date: "2026-09-20", type: "repair" }).success).toBe(false);
    expect(repairSchema.safeParse({ date: "20.09.2026", type: "repair", description: "x" }).success).toBe(false);
    expect(repairSchema.parse({ date: "2026-09-20", type: "repair", description: "Масло", cost: "80" }).cost).toBe(80);
  });
});
