import { describe, it, expect } from "vitest";
import { mapCompany } from "@/lib/companybook";

const base = {
  company: {
    uic: "123456789",
    status: "N",
    legalForm: "ЕООД",
    companyName: { name: "БЕТОН ЕООД" },
    companyNameTransliteration: { name: "BETON EOOD" },
    seat: { settlement: "София", street: "ул. Витоша", streetNumber: "1", postCode: "1000" },
  },
};

describe("mapCompany", () => {
  it("ДДС номер само от registerInfo.vat, не BG+ЕИК", () => {
    expect(mapCompany(base).vatNumber).toBe("");
    expect(mapCompany({ ...base, registerInfo: { vat: "BG123456789" } }).vatNumber).toBe("BG123456789");
    expect(mapCompany({ ...base, registerInfo: { vat: "bg 123456789" } }).vatNumber).toBe("BG123456789");
    expect(mapCompany({ ...base, registerInfo: { vat: "не" } }).vatNumber).toBe("");
  });

  it("статуси N/E активни, L/C не", () => {
    expect(mapCompany(base)).toMatchObject({ status: "Активна", active: true });
    expect(mapCompany({ company: { ...base.company, status: "E" } })).toMatchObject({ status: "Активна", active: true });
    expect(mapCompany({ company: { ...base.company, status: "L" } })).toMatchObject({ status: "Ликвидирана", active: false });
    expect(mapCompany({ company: { ...base.company, status: "C" } })).toMatchObject({ status: "Заличена", active: false });
  });

  it("адрес и имена", () => {
    const m = mapCompany(base);
    expect(m.address).toBe("София, ул. Витоша 1");
    expect(m.name).toBe("БЕТОН ЕООД");
    expect(m.nameLatin).toBe("BETON EOOD");
    expect(mapCompany({ company: { uic: "1", seat: { settlement: "Варна" } } }).address).toBe("Варна");
  });
});
