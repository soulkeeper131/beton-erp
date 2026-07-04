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
  const logoPath = c.logoPath ? path.join(process.cwd(), c.logoPath) : null;
  const hasLogo = logoPath && existsSync(logoPath);

  const styles = StyleSheet.create({
    page: { padding: 36, fontSize: 9, fontFamily: "DejaVu Sans", color: "#1a1a1a" },
    // Header
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, borderBottomWidth: 2, borderBottomColor: accent, paddingBottom: 10 },
    logo: { width: 80, height: 40, objectFit: "contain" },
    companyInfo: { flex: 1, marginLeft: hasLogo ? 12 : 0 },
    companyName: { fontSize: 13, fontWeight: "bold", color: accent },
    companyDetail: { fontSize: 8, color: "#555", marginTop: 1 },
    // Title
    titleBlock: { alignItems: "flex-end" },
    title: { fontSize: 16, fontWeight: "bold", color: accent },
    titleSub: { fontSize: 9, color: "#555", marginTop: 2 },
    // Party boxes
    parties: { flexDirection: "row", gap: 16, marginBottom: 10 },
    partyBox: { flex: 1, borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 4, padding: 10 },
    partyTitle: { fontSize: 9, fontWeight: "bold", color: accent, marginBottom: 4 },
    partyText: { fontSize: 8, marginBottom: 1 },
    // Info row
    infoRow: { flexDirection: "row", gap: 20, marginBottom: 10, paddingHorizontal: 2 },
    infoItem: { flexDirection: "row" },
    infoLabel: { fontSize: 8, color: "#888", width: 70 },
    infoValue: { fontSize: 8, fontWeight: "bold" },
    // Table
    table: { marginTop: 4 },
    tableHeader: { flexDirection: "row", backgroundColor: accent, padding: 5, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
    th: { fontSize: 7, fontWeight: "bold", color: "#fff" },
    tableRow: { flexDirection: "row", padding: 5, borderBottomWidth: 0.5, borderBottomColor: "#e8e8e8" },
    tableRowAlt: { flexDirection: "row", padding: 5, borderBottomWidth: 0.5, borderBottomColor: "#e8e8e8", backgroundColor: "#fafafa" },
    td: { fontSize: 8 },
    // Summary
    summary: { marginTop: 10, alignItems: "flex-end" },
    summaryRow: { flexDirection: "row", width: 200, marginBottom: 2 },
    summaryLabel: { flex: 1, fontSize: 8, textAlign: "right", color: "#555" },
    summaryValue: { width: 65, fontSize: 8, textAlign: "right" },
    summaryBold: { fontSize: 10, fontWeight: "bold", color: "#1a1a1a" },
    // Bank
    bankBox: { marginTop: 10, padding: 8, backgroundColor: "#f8f8f8", borderRadius: 3 },
    bankText: { fontSize: 8, color: "#555" },
    // Footer
    footer: { position: "absolute", bottom: 30, left: 36, right: 36 },
    footerLine: { borderTopWidth: 1, borderTopColor: accent, marginBottom: 6 },
    footerText: { fontSize: 7, color: "#999", textAlign: "center" },
    signBlock: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
    signLine: { borderTopWidth: 0.5, borderTopColor: "#999", width: 110, marginTop: 25 },
    signLabel: { fontSize: 7, color: "#777", marginTop: 2 },
  });

  const subtotal = invoice.subtotal || 0;
  const discount = invoice.discountAmount || 0;
  const vat = invoice.vatAmount || 0;
  const total = invoice.total || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            {hasLogo && <Image src={logoPath} style={styles.logo} />}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{c.companyName || "—"}</Text>
              {c.companyNameBG && c.companyNameBG !== c.companyName && <Text style={styles.companyDetail}>{c.companyNameBG}</Text>}
              {c.eik && <Text style={styles.companyDetail}>ЕИК: {c.eik}{c.vatNumber ? ` • ДДС: ${c.vatNumber}` : ""}</Text>}
              {c.address && <Text style={styles.companyDetail}>{c.city ? `${c.city}, ` : ""}{c.address}</Text>}
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.titleSub}>№ {invoice.number}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.parties}>
          <View style={styles.partyBox}>
            <Text style={styles.partyTitle}>Доставчик</Text>
            {c.companyName && <Text style={styles.partyText}>{c.companyName}</Text>}
            {c.eik && <Text style={styles.partyText}>ЕИК: {c.eik}</Text>}
            {c.vatNumber && <Text style={styles.partyText}>ДДС №: {c.vatNumber}</Text>}
            {c.address && <Text style={styles.partyText}>{c.city ? `${c.city}, ` : ""}{c.address}</Text>}
            {c.mol && <Text style={styles.partyText}>МОЛ: {c.mol}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyTitle}>Получател</Text>
            <Text style={styles.partyText}>{invoice.clientCompany || invoice.clientName || "—"}</Text>
            {invoice.clientEik && <Text style={styles.partyText}>ЕИК: {invoice.clientEik}</Text>}
            {invoice.clientVatNumber && <Text style={styles.partyText}>ДДС №: {invoice.clientVatNumber}</Text>}
            {invoice.clientAddress && <Text style={styles.partyText}>{invoice.clientAddress}</Text>}
          </View>
        </View>

        {/* Dates */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Дата:</Text><Text style={styles.infoValue}>{invoice.date || "—"}</Text></View>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Падеж:</Text><Text style={styles.infoValue}>{invoice.dueDate || "—"}</Text></View>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Дан. събитие:</Text><Text style={styles.infoValue}>{invoice.taxEventDate || "—"}</Text></View>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Плащане:</Text><Text style={styles.infoValue}>{invoice.paymentMethod === "bank" ? "Банков превод" : invoice.paymentMethod === "cash" ? "В брой" : "Карта"}</Text></View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Описание</Text>
            <Text style={[styles.th, { width: 35, textAlign: "center" }]}>М-ка</Text>
            <Text style={[styles.th, { width: 40, textAlign: "center" }]}>К-во</Text>
            <Text style={[styles.th, { width: 55, textAlign: "right" }]}>Цена</Text>
            <Text style={[styles.th, { width: 35, textAlign: "center" }]}>ДДС</Text>
            <Text style={[styles.th, { width: 60, textAlign: "right" }]}>Стойност</Text>
          </View>
          {items.map((item: any, i: number) => (
            <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={i}>
              <Text style={[styles.td, { flex: 2 }]}>{item.description}</Text>
              <Text style={[styles.td, { width: 35, textAlign: "center" }]}>{item.unit}</Text>
              <Text style={[styles.td, { width: 40, textAlign: "center" }]}>{item.quantity}</Text>
              <Text style={[styles.td, { width: 55, textAlign: "right" }]}>{item.price.toFixed(2)}</Text>
              <Text style={[styles.td, { width: 35, textAlign: "center" }]}>{item.vatRate}%</Text>
              <Text style={[styles.td, { width: 60, textAlign: "right" }]}>{item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Данъчна основа:</Text>
            <Text style={styles.summaryValue}>{subtotal.toFixed(2)} {invoice.currency}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Отстъпка:</Text>
              <Text style={styles.summaryValue}>-{discount.toFixed(2)} {invoice.currency}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ДДС {invoice.vatRate}%:</Text>
            <Text style={styles.summaryValue}>{vat.toFixed(2)} {invoice.currency}</Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: accent, paddingTop: 3, marginTop: 3 }]}>
            <Text style={[styles.summaryLabel, styles.summaryBold]}>Общо за плащане:</Text>
            <Text style={[styles.summaryValue, styles.summaryBold, { color: accent }]}>{total.toFixed(2)} {invoice.currency}</Text>
          </View>
        </View>

        {/* Bank info */}
        {(c.bankName || c.iban) && (
          <View style={styles.bankBox}>
            <Text style={styles.bankText}>Банкова сметка: {[c.bankName, c.iban ? `IBAN: ${c.iban}` : "", c.bic ? `BIC: ${c.bic}` : ""].filter(Boolean).join(" • ")}</Text>
          </View>
        )}

        {/* Exemption / Notes */}
        {invoice.taxExemptionReason && <Text style={{ fontSize: 7, color: "#888", marginTop: 6 }}>Основание за 0% ДДС: {invoice.taxExemptionReason}</Text>}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>{c.companyName || ""} • {c.eik ? `ЕИК ${c.eik}` : ""} • {c.city || ""}</Text>
          <View style={styles.signBlock}>
            <View><View style={styles.signLine} /><Text style={styles.signLabel}>Изготвил: ..............................</Text></View>
            <View><View style={styles.signLine} /><Text style={styles.signLabel}>Получил: ..............................</Text></View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
