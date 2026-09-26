import { describe, it, expect } from "vitest";
import { clientSchema } from "@/lib/clients";

describe("клиенти — валидация", () => {
  it("празни полета → null, ЕИК/ЕГН 9/10/13 цифри", () => {
    const r = clientSchema.parse({ name: "Иван", eik: "", email: "", companyName: "  " });
    expect(r.eik).toBeNull();
    expect(r.email).toBeNull();
    expect(r.companyName).toBeNull();
    expect(clientSchema.safeParse({ name: "А", eik: "123456789" }).success).toBe(true);
    expect(clientSchema.safeParse({ name: "А", eik: "8001011234" }).success).toBe(true);
    expect(clientSchema.safeParse({ name: "А", eik: "12345" }).success).toBe(false);
  });
  it("невалиден имейл се отказва", () => {
    expect(clientSchema.safeParse({ name: "А", email: "не-имейл" }).success).toBe(false);
    expect(clientSchema.safeParse({ name: "А", email: "a@b.bg" }).success).toBe(true);
  });
});
