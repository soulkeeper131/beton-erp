import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import path from "path";
import { existsSync } from "fs";

// Register Cyrillic-capable font (built-in Helvetica lacks Cyrillic glyphs)
Font.register({
  family: "DejaVu Sans",
  fonts: [
    { src: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", fontWeight: "normal" },
    { src: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fontWeight: "bold" },
  ],
});

const typeLabels: Record<string, string> = {
  invoice: "ФАКТУРА", proforma: "ПРОФОРМА", credit_note: "КРЕДИТНО ИЗВЕСТИЕ", debit_note: "ДЕБИТНО ИЗВЕСТИЕ",
};

type Props = { invoice: any; items: any[]; company: any };

export function InvoicePDF({ invoice, items, company }: Props) {
  const c = company || {};
  const accent = c.accentColor || "#f97316";
  const title = typeLabels[invoice.type] || "ФАКТУРА";
  const direction = invoice.direction || "outgoing";
  const logoPath = c.logoPath ? path.join(process.cwd(), c.logoPath) : null;
  const hasLogo = logoPath && existsSync(logoPath);

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "DejaVu Sans", color: "#1a1a1a" },

    // ── HEADER (same as offer) ──
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, paddingBottom: 14, borderBottomWidth: 3, borderBottomColor: accent },
    logo: { width: 100, height: 45, objectFit: "contain" },
    companyCol: { flex: 1, paddingRight: 10 },
    companyName: { fontSize: 14, fontWeight: "bold", color: accent, marginBottom: 4 },
    companyRow: { flexDirection: "row", marginBottom: 3, alignItems: "flex-start" },
    companyLabel: { fontSize: 9, color: "#aaa", width: 55, flexShrink: 0 },
    companyValue: { fontSize: 9, color: "#444", flex: 1 },

    // Title block (right)
    titleCol: { alignItems: "flex-end", flexShrink: 0, minWidth: 120 },
    titleBig: { fontSize: 22, fontWeight: "bold", color: accent, marginBottom: 8 },
    titleNum: { fontSize: 11, fontWeight: "bold", color: "#333", marginBottom: 8 },
    titleDateRow: { flexDirection: "row", marginBottom: 3, justifyContent: "flex-end" },
    titleDateLabel: { fontSize: 9, color: "#aaa", marginRight: 4 },
    titleDateValue: { fontSize: 9, fontWeight: "bold", color: "#333" },

    // ── PARTY BOXES ──
    partySection: { flexDirection: "row", marginBottom: 12, marginTop: 6 },
    partyBox: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 4, padding: 12, marginRight: 12 },
    partyBoxLast: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 4, padding: 12 },
    partyTitle: { fontSize: 9, fontWeight: "bold", color: accent, marginBottom: 6 },
    partyRow: { flexDirection: "row", marginBottom: 3, alignItems: "flex-start" },
    partyLabel: { width: 55, fontSize: 8, color: "#aaa", flexShrink: 0 },
    partyValue: { flex: 1, fontSize: 8, fontWeight: "bold" },

    // ── DATES ROW ──
    infoRow: { flexDirection: "row", marginBottom: 10, flexWrap: "wrap" },
    infoItem: { flexDirection: "row", marginRight: 24, marginBottom: 3 },
    infoLabel: { fontSize: 9, color: "#aaa", marginRight: 4 },
    infoValue: { fontSize: 9, fontWeight: "bold" },

    // ── TABLE ──
    table: { marginTop: 6 },
    thead: { flexDirection: "row", backgroundColor: accent, paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    th: { fontSize: 8, fontWeight: "bold", color: "#fff" },
    trow: { flexDirection: "row", paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
    trowAlt: { flexDirection: "row", paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: "#eee", backgroundColor: "#f9f9f9" },
    td: { fontSize: 9 },

    // ── SUMMARY ──
    summaryWrap: { marginTop: 14, alignItems: "flex-end" },
    summaryBox: { width: 240, borderWidth: 1, borderColor: "#ddd", borderRadius: 4, padding: 10 },
    srow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    slab: { fontSize: 9, color: "#666" },
    sval: { fontSize: 9, fontWeight: "bold" },
    stotalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: accent },
    stotalLab: { fontSize: 12, fontWeight: "bold" },
    stotalVal: { fontSize: 12, fontWeight: "bold", color: accent },

    // ── BANK ──
    bankBox: { marginTop: 12, padding: 10, backgroundColor: "#f9f9f9", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: accent },
    bankText: { fontSize: 9, color: "#666" },

    // ── FOOTER ──
    footer: { position: "absolute", bottom: 35, left: 40, right: 40 },
    footLine: { borderTopWidth: 1.5, borderTopColor: accent, marginBottom: 10 },
    footText: { fontSize: 8, color: "#bbb", textAlign: "center", marginBottom: 22 },
    signRow: { flexDirection: "row", justifyContent: "space-between" },
    signCol: { alignItems: "center", width: 140 },
    signLine: { borderTopWidth: 1, borderTopColor: "#ddd", width: "100%", marginBottom: 4 },
    signLab: { fontSize: 8, color: "#aaa" },

    // ── SMALL TEXT ──
    exemption: { fontSize: 8, color: "#888", marginTop: 6 },
  });

  const subtotal = invoice.subtotal || 0;
  const discount = invoice.discountAmount || 0;
  const vat = invoice.vatAmount || 0;
  const total = invoice.total || 0;

  const isIncoming = direction === "incoming";

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ═══ HEADER ═══ */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            {hasLogo ? <Image src={logoPath!} style={styles.logo} /> : null}
            <View style={[styles.companyCol, hasLogo ? { marginLeft: 14 } : {}]}>
              <Text style={styles.companyName}>{c.companyName || "-"}</Text>
              {c.eik ? (
                <View style={styles.companyRow}>
                  <Text style={styles.companyLabel}>ЕИК:</Text>
                  <Text style={styles.companyValue}>{c.eik}{c.vatNumber ? ` / ДДС: ${c.vatNumber}` : ""}</Text>
                </View>
              ) : null}
              {c.address ? (
                <View style={styles.companyRow}>
                  <Text style={styles.companyLabel}>Адрес:</Text>
                  <Text style={styles.companyValue}>{[c.city, c.address].filter(Boolean).join(", ")}</Text>
                </View>
              ) : null}
              {c.phone ? (
                <View style={styles.companyRow}>
                  <Text style={styles.companyLabel}>Телефон:</Text>
                  <Text style={styles.companyValue}>{c.phone}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.titleCol}>
            <Text style={styles.titleBig}>{isIncoming ? "ВХОДЯЩА" : title}</Text>
            <Text style={styles.titleNum}>№ {invoice.number}</Text>
            <View style={styles.titleDateRow}>
              <Text style={styles.titleDateLabel}>Дата:</Text>
              <Text style={styles.titleDateValue}>{invoice.date || "-"}</Text>
            </View>
            {invoice.dueDate ? (
              <View style={styles.titleDateRow}>
                <Text style={styles.titleDateLabel}>Падеж:</Text>
                <Text style={styles.titleDateValue}>{invoice.dueDate}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ═══ PARTIES ═══ */}
        <View style={styles.partySection}>
          <View style={styles.partyBox}>
            <Text style={styles.partyTitle}>{isIncoming ? "ДОСТАВЧИК" : "ДОСТАВЧИК"}</Text>
            {c.companyName ? (
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>Име:</Text>
                <Text style={styles.partyValue}>{c.companyName}</Text>
              </View>
            ) : null}
            {c.eik ? (
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>ЕИК:</Text>
                <Text style={styles.partyValue}>{c.eik}</Text>
              </View>
            ) : null}
            {c.vatNumber ? (
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>ДДС №:</Text>
                <Text style={styles.partyValue}>{c.vatNumber}</Text>
              </View>
            ) : null}
            {c.address ? (
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>Адрес:</Text>
                <Text style={styles.partyValue}>{[c.city, c.address].filter(Boolean).join(", ")}</Text>
              </View>
            ) : null}
            {c.mol ? (
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>МОЛ:</Text>
                <Text style={styles.partyValue}>{c.mol}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.partyBoxLast}>
            <Text style={styles.partyTitle}>{isIncoming ? "ПОЛУЧАТЕЛ" : "ПОЛУЧАТЕЛ"}</Text>
            <View style={styles.partyRow}>
              <Text style={styles.partyLabel}>Име:</Text>
              <Text style={styles.partyValue}>{invoice.clientCompany || invoice.clientName || "-"}</Text>
            </View>
            {invoice.clientEik ? (
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>ЕИК:</Text>
                <Text style={styles.partyValue}>{invoice.clientEik}</Text>
              </View>
            ) : null}
            {invoice.clientVatNumber ? (
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>ДДС №:</Text>
                <Text style={styles.partyValue}>{invoice.clientVatNumber}</Text>
              </View>
            ) : null}
            {invoice.clientAddress ? (
              <View style={styles.partyRow}>
                <Text style={styles.partyLabel}>Адрес:</Text>
                <Text style={styles.partyValue}>{invoice.clientAddress}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ═══ DATES ═══ */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Дата:</Text>
            <Text style={styles.infoValue}>{invoice.date || "-"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Падеж:</Text>
            <Text style={styles.infoValue}>{invoice.dueDate || "-"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Данъчно събитие:</Text>
            <Text style={styles.infoValue}>{invoice.taxEventDate || "-"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Плащане:</Text>
            <Text style={styles.infoValue}>
              {invoice.paymentMethod === "bank" ? "Банков превод" : invoice.paymentMethod === "cash" ? "В брой" : invoice.paymentMethod === "card" ? "Карта" : "-"}
            </Text>
          </View>
          {invoice.paymentStatus ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Статус:</Text>
              <Text style={styles.infoValue}>
                {invoice.paymentStatus === "paid" ? "Платена" : invoice.paymentStatus === "partial" ? "Частично платена" : "Неплатена"}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ═══ TABLE ═══ */}
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { flex: 2.5 }]}>Описание</Text>
            <Text style={[styles.th, { width: 40, textAlign: "center" }]}>М-ка</Text>
            <Text style={[styles.th, { width: 45, textAlign: "center" }]}>К-во</Text>
            <Text style={[styles.th, { width: 60, textAlign: "right" }]}>Цена</Text>
            <Text style={[styles.th, { width: 40, textAlign: "center" }]}>ДДС</Text>
            <Text style={[styles.th, { width: 70, textAlign: "right" }]}>Стойност</Text>
          </View>
          {(items || []).map((item: any, i: number) => (
            <View style={i % 2 === 0 ? styles.trow : styles.trowAlt} key={i} wrap={false}>
              <Text style={[styles.td, { flex: 2.5 }]}>{item.description || "-"}</Text>
              <Text style={[styles.td, { width: 40, textAlign: "center" }]}>{item.unit || "-"}</Text>
              <Text style={[styles.td, { width: 45, textAlign: "center" }]}>{item.quantity}</Text>
              <Text style={[styles.td, { width: 60, textAlign: "right" }]}>{(item.price || 0).toFixed(2)} €</Text>
              <Text style={[styles.td, { width: 40, textAlign: "center" }]}>{item.vatRate}%</Text>
              <Text style={[styles.td, { width: 70, textAlign: "right", fontWeight: "bold" }]}>{(item.total || 0).toFixed(2)} €</Text>
            </View>
          ))}
        </View>

        {/* ═══ SUMMARY ═══ */}
        <View style={styles.summaryWrap}>
          <View style={styles.summaryBox}>
            <View style={styles.srow}>
              <Text style={styles.slab}>Данъчна основа:</Text>
              <Text style={styles.sval}>{subtotal.toFixed(2)} €</Text>
            </View>
            {discount > 0 ? (
              <View style={styles.srow}>
                <Text style={styles.slab}>Отстъпка:</Text>
                <Text style={styles.sval}>-{discount.toFixed(2)} €</Text>
              </View>
            ) : null}
            <View style={styles.srow}>
              <Text style={styles.slab}>ДДС {invoice.vatRate || 20}%:</Text>
              <Text style={styles.sval}>{vat.toFixed(2)} €</Text>
            </View>
            <View style={styles.stotalRow}>
              <Text style={styles.stotalLab}>ОБЩО ЗА ПЛАЩАНЕ</Text>
              <Text style={styles.stotalVal}>{total.toFixed(2)} €</Text>
            </View>
          </View>
        </View>

        {/* ═══ BANK ═══ */}
        {(c.bankName || c.iban) ? (
          <View style={styles.bankBox}>
            <Text style={styles.bankText}>
              Банкова сметка: {[c.bankName, c.iban ? `IBAN: ${c.iban}` : "", c.bic ? `BIC: ${c.bic}` : ""].filter(Boolean).join(" • ")}
            </Text>
          </View>
        ) : null}

        {/* ═══ EXEMPTION ═══ */}
        {invoice.taxExemptionReason ? (
          <Text style={styles.exemption}>Основание за 0% ДДС: {invoice.taxExemptionReason}</Text>
        ) : null}

        {/* ═══ FOOTER ═══ */}
        <View style={styles.footer}>
          <View style={styles.footLine} />
          <Text style={styles.footText}>
            {[c.companyName, c.eik ? `ЕИК ${c.eik}` : "", c.city].filter(Boolean).join("  •  ")}
            {"  —  "}Фактура № {invoice.number}
          </Text>
          <View style={styles.signRow}>
            <View style={styles.signCol}>
              <View style={styles.signLine} />
              <Text style={styles.signLab}>Изготвил: ________________________</Text>
            </View>
            <View style={styles.signCol}>
              <View style={styles.signLine} />
              <Text style={styles.signLab}>Получил: ________________________</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}
