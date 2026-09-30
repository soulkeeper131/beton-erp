// Преобразува отговора на CompanyBook (GET /companies/{uic}?with_data=true) към полетата
// на клиента. Чиста функция — тества се без мрежа.

const STATUS_TEXT: Record<string, string> = { N: "Активна", E: "Активна", L: "Ликвидирана", C: "Заличена" };

export type CompanyInfo = {
  eik: string;
  name: string;
  nameLatin: string;
  legalForm: string;
  status: string;
  active: boolean;
  address: string;
  city: string;
  postCode: string;
  vatNumber: string;
};

export function mapCompany(data: any): CompanyInfo {
  const c = data?.company || {};
  // ДДС номер само ако фирмата е регистрирана по ЗДДС (registerInfo.vat). Преди винаги
  // се слагаше „BG“ + ЕИК — и на фирми без ДДС регистрация, което после се печаташе на фактурите.
  const vat = String(data?.registerInfo?.vat || c.registerInfo?.vat || "").replace(/\s/g, "").toUpperCase();
  const seat = c.seat || {};
  const street = [seat.street, seat.streetNumber].filter(Boolean).join(" ");
  return {
    eik: String(c.uic || ""),
    name: c.companyName?.name || "",
    nameLatin: c.companyNameTransliteration?.name || "",
    legalForm: c.legalForm || "",
    status: STATUS_TEXT[c.status] || c.status || "",
    active: c.status === "N" || c.status === "E",
    address: [seat.settlement, street].filter(Boolean).join(", "),
    city: seat.settlement || "",
    postCode: seat.postCode || "",
    vatNumber: /^BG\d{9,10}$/.test(vat) ? vat : "",
  };
}
