import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import path from "path";
import { existsSync } from "fs";

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
  const title = typeLabels[invoice.type] || "ФАКТУРА";
  const direction = invoice.direction || "outgoing";
  const isIncoming = direction === "incoming";
  const logoPath = c.logoPath ? path.join(process.cwd(), c.logoPath) : null;
  const hasLogo = logoPath && existsSync(logoPath);

  const border = { borderWidth: 1, borderColor: "#000" };
  const borderBottom = { borderBottomWidth: 1, borderBottomColor: "#000" };
  const borderRight = { borderRightWidth: 1, borderRightColor: "#000" };

  const styles = StyleSheet.create({
    page: { padding: 24, fontSize: 8, fontFamily: "DejaVu Sans", color: "#000" },

    // ─── HEADER ───
    header: { flexDirection: "row", marginBottom: 8 },
    logoBox: { width: 90, height: 40, justifyContent: "center", alignItems: "center", marginRight: 12 },
    logoImg: { width: 80, height: 35, objectFit: "contain" },
    companyInfo: { flex: 1 },
    companyName: { fontSize: 11, fontWeight: "bold", marginBottom: 2 },
    companyRow: { flexDirection: "row", marginBottom: 1 },
    companyLabel: { fontSize: 7, color: "#555", width: 45 },
    companyValue: { fontSize: 7 },

    // ─── TITLE BLOCK ───
    titleBox: { flexDirection: "row", ...border, marginBottom: 8 },
    originalCell: { width: 55, padding: 8, ...borderRight, justifyContent: "center", alignItems: "center" },
    originalText: { fontSize: 10, fontWeight: "bold" },
    titleCell: { flex: 1, padding: 6, alignItems: "center" },
    titleText: { fontSize: 14, fontWeight: "bold", marginBottom: 2 },
    titleNum: { fontSize: 10, fontWeight: "bold" },
    dateCell: { width: 100, padding: 6, ...borderRight },
    dateRow: { flexDirection: "row", marginBottom: 2 },
    dateLabel: { fontSize: 7, width: 35 },
    dateValue: { fontSize: 7, fontWeight: "bold" },

    // ─── PARTIES (two-column) ───
    partiesRow: { flexDirection: "row", ...border, marginBottom: 8 },
    partyLeft: { flex: 1, padding: 6, ...borderRight },
    partyRight: { flex: 1, padding: 6 },
    partyLabel: { fontSize: 8, fontWeight: "bold", marginBottom: 4 },
    partyText: { fontSize: 8, marginBottom: 2 },
    partyBold: { fontSize: 8, fontWeight: "bold" },

    // ─── DATES ROW ───
    infoRow: { flexDirection: "row", marginBottom: 8, flexWrap: "wrap", gap: 4 },
    infoItem: { flexDirection: "row", marginRight: 16 },
    infoLabel: { fontSize: 7, color: "#555", marginRight: 3 },
    infoValue: { fontSize: 7, fontWeight: "bold" },

    // ─── TABLE ───
    table: { marginBottom: 4 },
    thead: { flexDirection: "row", ...border, backgroundColor: "#eee" },
    th: { fontSize: 7, fontWeight: "bold", padding: 4, textAlign: "center" },
    thLeft: { fontSize: 7, fontWeight: "bold", padding: 4 },
    tbody: { borderLeftWidth: 1, borderLeftColor: "#000", borderRightWidth: 1, borderRightColor: "#000" },
    trow: { flexDirection: "row", ...borderBottom },
    td: { fontSize: 7, padding: 3, textAlign: "center" },
    tdLeft: { fontSize: 7, padding: 3 },

    // ─── SUMMARY ───
    summaryWrap: { alignItems: "flex-end", marginBottom: 6 },
    summaryBox: { width: 220 },
    srow: { flexDirection: "row", ...border, borderTopWidth: 0 },
    slab: { width: 120, fontSize: 8, fontWeight: "bold", padding: 4, backgroundColor: "#eee", ...borderRight },
    sval: { flex: 1, fontSize: 8, padding: 4, textAlign: "right", paddingRight: 8 },
    srowTotal: { flexDirection: "row", ...border, borderTopWidth: 2 },
    slabTotal: { width: 120, fontSize: 10, fontWeight: "bold", padding: 4, backgroundColor: "#eee", ...borderRight },
    svalTotal: { flex: 1, fontSize: 10, fontWeight: "bold", padding: 4, textAlign: "right", paddingRight: 8 },

    // ─── BANK ───
    bankBox: { ...border, padding: 6, marginBottom: 8 },
    bankLabel: { fontSize: 7, fontWeight: "bold", marginBottom: 2 },
    bankText: { fontSize: 7 },

    // ─── TAX EXEMPTION ───
    exemptionBox: { ...border, padding: 6, marginBottom: 8 },
    exemptionText: { fontSize: 7 },

    // ─── SIGNATURES ───
    signTable: { marginTop: 8 },
    signHeader: { flexDirection: "row", backgroundColor: "#eee", ...border },
    signH: { fontSize: 7, fontWeight: "bold", padding: 3, textAlign: "center" },
    signRow: { flexDirection: "row", ...border, borderTopWidth: 0, minHeight: 30 },
    signCell: { fontSize: 7, padding: 3, ...borderRight },

    // ─── FOOTER ───
    footer: { position: "absolute", bottom: 20, left: 24, right: 24 },
    footText: { fontSize: 6, color: "#888", textAlign: "center" },
  });

  const subtotal = invoice.subtotal || 0;
  const vat = invoice.vatAmount || 0;
  const total = invoice.total || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ═══ HEADER ═══ */}
        <View style={styles.header}>
          {hasLogo ? (
            <View style={styles.logoBox}>
              <Image src={logoPath!} style={styles.logoImg} />
            </View>
          ) : null}
          <View style={styles.companyInfo}>
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
                <Text style={styles.companyLabel}>Тел:</Text>
                <Text style={styles.companyValue}>{c.phone}</Text>
              </View>
            ) : null}
            {c.email ? (
              <View style={styles.companyRow}>
                <Text style={styles.companyLabel}>Email:</Text>
                <Text style={styles.companyValue}>{c.email}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ═══ TITLE ═══ */}
        <View style={styles.titleBox}>
          <View style={styles.originalCell}>
            <Text style={styles.originalText}>ОРИГИНАЛ</Text>
          </View>
          <View style={styles.titleCell}>
            <Text style={styles.titleText}>{isIncoming ? "ВХОДЯЩА " : ""}{title}</Text>
            <Text style={styles.titleNum}>№ {invoice.number || "-"}</Text>
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
            <Text style={styles.infoLabel}>Дан. събитие:</Text>
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
                {invoice.paymentStatus === "paid" ? "Платена" : invoice.paymentStatus === "partial" ? "Частично" : "Неплатена"}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ═══ PARTIES ═══ */}
        <View style={styles.partiesRow}>
          <View style={styles.partyLeft}>
            <Text style={styles.partyLabel}>ДОСТАВЧИК</Text>
            {c.companyName ? <Text style={styles.partyBold}>{c.companyName}</Text> : null}
            {c.eik ? <Text style={styles.partyText}>ЕИК: {c.eik}{c.vatNumber ? ` / ДДС: ${c.vatNumber}` : ""}</Text> : null}
            {c.address ? <Text style={styles.partyText}>{[c.city, c.address].filter(Boolean).join(", ")}</Text> : null}
            {c.mol ? <Text style={styles.partyText}>МОЛ: {c.mol}</Text> : null}
          </View>
          <View style={styles.partyRight}>
            <Text style={styles.partyLabel}>ПОЛУЧАТЕЛ</Text>
            <Text style={styles.partyBold}>{invoice.clientCompany || invoice.clientName || "-"}</Text>
            {invoice.clientEik ? <Text style={styles.partyText}>ЕИК: {invoice.clientEik}{invoice.clientVatNumber ? ` / ДДС: ${invoice.clientVatNumber}` : ""}</Text> : null}
            {invoice.clientAddress ? <Text style={styles.partyText}>{invoice.clientAddress}</Text> : null}
          </View>
        </View>

        {/* ═══ TABLE ═══ */}
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.thLeft, { flex: 3 }]}>Наименование на услугата/стоката</Text>
            <Text style={[styles.th, { width: 35 }]}>М-ка</Text>
            <Text style={[styles.th, { width: 40 }]}>К-во</Text>
            <Text style={[styles.th, { width: 50 }]}>Цена €</Text>
            <Text style={[styles.th, { width: 35 }]}>ДДС%</Text>
            <Text style={[styles.th, { width: 60 }]}>Стойност €</Text>
          </View>
          <View style={styles.tbody}>
            {(items || []).map((item: any, i: number) => (
              <View style={styles.trow} key={i} wrap={false}>
                <Text style={[styles.tdLeft, { flex: 3 }]}>{item.description || "-"}</Text>
                <Text style={[styles.td, { width: 35 }]}>{item.unit || "бр."}</Text>
                <Text style={[styles.td, { width: 40 }]}>{item.quantity}</Text>
                <Text style={[styles.td, { width: 50 }]}>{(item.price || 0).toFixed(2)}</Text>
                <Text style={[styles.td, { width: 35 }]}>{item.vatRate || 20}%</Text>
                <Text style={[styles.td, { width: 60 }]}>{(item.total || 0).toFixed(2)}</Text>
              </View>
            ))}
            {/* Empty rows for form look */}
            {Array.from({ length: Math.max(0, 6 - (items || []).length) }).map((_, i) => (
              <View style={styles.trow} key={`empty-${i}`}>
                <Text style={[styles.tdLeft, { flex: 3 }]}> </Text>
                <Text style={[styles.td, { width: 35 }]}> </Text>
                <Text style={[styles.td, { width: 40 }]}> </Text>
                <Text style={[styles.td, { width: 50 }]}> </Text>
                <Text style={[styles.td, { width: 35 }]}> </Text>
                <Text style={[styles.td, { width: 60 }]}> </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══ SUMMARY ═══ */}
        <View style={styles.summaryWrap}>
          <View style={styles.summaryBox}>
            <View style={styles.srow}>
              <Text style={styles.slab}>Данъчна основа</Text>
              <Text style={styles.sval}>{subtotal.toFixed(2)} €</Text>
            </View>
            <View style={styles.srow}>
              <Text style={styles.slab}>ДДС {invoice.vatRate || 20}%</Text>
              <Text style={styles.sval}>{vat.toFixed(2)} €</Text>
            </View>
            <View style={styles.srowTotal}>
              <Text style={styles.slabTotal}>ОБЩО ЗА ПЛАЩАНЕ</Text>
              <Text style={styles.svalTotal}>{total.toFixed(2)} €</Text>
            </View>
          </View>
        </View>

        {/* ═══ BANK ═══ */}
        {(c.bankName || c.iban) ? (
          <View style={styles.bankBox}>
            <Text style={styles.bankLabel}>Банкова сметка:</Text>
            <Text style={styles.bankText}>
              {[c.bankName, c.iban ? `IBAN: ${c.iban}` : "", c.bic ? `BIC: ${c.bic}` : ""].filter(Boolean).join(" • ")}
            </Text>
          </View>
        ) : null}

        {/* ═══ TAX EXEMPTION ═══ */}
        {invoice.taxExemptionReason ? (
          <View style={styles.exemptionBox}>
            <Text style={styles.exemptionText}>Основание за неначисляване на ДДС: {invoice.taxExemptionReason}</Text>
          </View>
        ) : null}

        {/* ═══ SIGNATURES ═══ */}
        <View style={styles.signTable}>
          <View style={styles.signHeader}>
            <Text style={[styles.signH, { flex: 1 }]}>Съставил:</Text>
            <Text style={[styles.signH, { flex: 1 }]}>Получил:</Text>
          </View>
          <View style={styles.signRow}>
            <View style={[styles.signCell, { flex: 1 }]}>
              <Text style={{ fontSize: 7 }}> </Text>
              <Text style={{ fontSize: 7 }}>Име: .....................................</Text>
              <Text style={{ fontSize: 7 }}>Подпис: ................................</Text>
            </View>
            <View style={[{ flex: 1, padding: 3 }]}>
              <Text style={{ fontSize: 7 }}> </Text>
              <Text style={{ fontSize: 7 }}>Име: .....................................</Text>
              <Text style={{ fontSize: 7 }}>Подпис: ................................</Text>
            </View>
          </View>
        </View>

        {/* ═══ FOOTER ═══ */}
        <View style={styles.footer}>
          <Text style={styles.footText}>
            {[c.companyName, c.eik ? `ЕИК ${c.eik}` : "", c.city].filter(Boolean).join("  •  ")}
            {"  —  "}Фактура № {invoice.number} / {invoice.date}
          </Text>
        </View>

      </Page>
    </Document>
  );
}
