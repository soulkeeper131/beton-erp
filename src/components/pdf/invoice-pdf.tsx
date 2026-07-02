import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  companyName: { fontSize: 14, fontWeight: "bold" },
  companyDetails: { fontSize: 8, color: "#555", marginTop: 1 },
  title: { fontSize: 18, fontWeight: "bold", textAlign: "right" },
  subtitle: { fontSize: 9, color: "#555", textAlign: "right", marginTop: 1 },
  parties: { flexDirection: "row", gap: 20, marginBottom: 16 },
  partyBox: { flex: 1, borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 2 },
  partyTitle: { fontSize: 9, fontWeight: "bold", marginBottom: 4, textTransform: "uppercase" },
  partyText: { fontSize: 8, marginBottom: 1 },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { width: 80, fontSize: 8, color: "#555" },
  infoValue: { fontSize: 8 },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f0f0f0", padding: 4, borderBottomWidth: 1 },
  th: { fontSize: 8, fontWeight: "bold" },
  tableRow: { flexDirection: "row", padding: 4, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  td: { fontSize: 8 },
  summary: { marginTop: 12, alignItems: "flex-end" },
  summaryRow: { flexDirection: "row", width: 220, marginBottom: 2 },
  summaryLabel: { flex: 1, fontSize: 8, textAlign: "right" },
  summaryValue: { width: 70, fontSize: 8, textAlign: "right" },
  summaryBold: { fontSize: 10, fontWeight: "bold" },
  bankInfo: { marginTop: 16, fontSize: 8, color: "#555" },
  footer: { marginTop: 20 },
  signLine: { borderTopWidth: 0.5, borderTopColor: "#999", width: 120, marginTop: 30 },
  signLabel: { fontSize: 8, color: "#555", marginTop: 2 },
});

const typeLabels: Record<string, string> = {
  invoice: "ФАКТУРА", proforma: "ПРОФОРМА ФАКТУРА",
  credit_note: "КРЕДИТНО ИЗВЕСТИЕ", debit_note: "ДЕБИТНО ИЗВЕСТИЕ",
};

type Props = { invoice: any; items: any[]; company: any };

export function InvoicePDF({ invoice, items, company }: Props) {
  const c = company || {};
  const title = typeLabels[invoice.type] || "ФАКТУРА";

  const subtotal = invoice.subtotal || 0;
  const discount = invoice.discountAmount || 0;
  const vatAmount = invoice.vatAmount || 0;
  const total = invoice.total || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{c.companyName || "—"}</Text>
            {c.companyNameBG && c.companyNameBG !== c.companyName && (
              <Text style={styles.companyDetails}>{c.companyNameBG}</Text>
            )}
            {c.eik && <Text style={styles.companyDetails}>ЕИК: {c.eik}</Text>}
            {c.vatNumber && <Text style={styles.companyDetails}>ДДС №: {c.vatNumber}</Text>}
            {c.address && <Text style={styles.companyDetails}>{c.city ? `${c.city}, ` : ""}{c.address}</Text>}
            {c.mol && <Text style={styles.companyDetails}>МОЛ: {c.mol}</Text>}
          </View>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>№ {invoice.number}</Text>
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
        <View style={{ flexDirection: "row", gap: 30, marginBottom: 10 }}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Дата:</Text>
            <Text style={styles.infoValue}>{invoice.date || "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Падеж:</Text>
            <Text style={styles.infoValue}>{invoice.dueDate || "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Дан. събитие:</Text>
            <Text style={styles.infoValue}>{invoice.taxEventDate || "—"}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1 }]}>Описание</Text>
            <Text style={[styles.th, { width: 40, textAlign: "center" }]}>Мярка</Text>
            <Text style={[styles.th, { width: 45, textAlign: "center" }]}>К-во</Text>
            <Text style={[styles.th, { width: 60, textAlign: "right" }]}>Цена</Text>
            <Text style={[styles.th, { width: 40, textAlign: "center" }]}>ДДС%</Text>
            <Text style={[styles.th, { width: 65, textAlign: "right" }]}>Стойност</Text>
          </View>
          {items.map((item: any, i: number) => (
            <View style={styles.tableRow} key={i}>
              <Text style={[styles.td, { flex: 1 }]}>{item.description}</Text>
              <Text style={[styles.td, { width: 40, textAlign: "center" }]}>{item.unit}</Text>
              <Text style={[styles.td, { width: 45, textAlign: "center" }]}>{item.quantity}</Text>
              <Text style={[styles.td, { width: 60, textAlign: "right" }]}>{item.price.toFixed(2)}</Text>
              <Text style={[styles.td, { width: 40, textAlign: "center" }]}>{item.vatRate}%</Text>
              <Text style={[styles.td, { width: 65, textAlign: "right" }]}>{item.total.toFixed(2)}</Text>
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
            <Text style={styles.summaryValue}>{vatAmount.toFixed(2)} {invoice.currency}</Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: "#000", paddingTop: 2, marginTop: 2 }]}>
            <Text style={[styles.summaryLabel, styles.summaryBold]}>Общо:</Text>
            <Text style={[styles.summaryValue, styles.summaryBold]}>{total.toFixed(2)} {invoice.currency}</Text>
          </View>
        </View>

        {/* Bank Info */}
        {(c.bankName || c.iban) && (
          <View style={styles.bankInfo}>
            <Text>Банкова сметка:</Text>
            {c.bankName && <Text>{c.bankName}</Text>}
            {c.iban && <Text>IBAN: {c.iban}</Text>}
            {c.bic && <Text>BIC: {c.bic}</Text>}
          </View>
        )}

        {/* Notes + tax exemption */}
        {invoice.taxExemptionReason && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 8, color: "#555" }}>Основание за нулева ставка: {invoice.taxExemptionReason}</Text>
          </View>
        )}
        {invoice.notes && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 8, color: "#555" }}>Забележка: {invoice.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.footer}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>Изготвил: ..............................</Text>
            </View>
            <View>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>Получил: ..............................</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
