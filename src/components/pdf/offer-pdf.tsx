import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  companyName: { fontSize: 16, fontWeight: "bold" },
  companyDetails: { fontSize: 8, color: "#555", marginTop: 2 },
  title: { fontSize: 18, fontWeight: "bold", textAlign: "right", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#555", textAlign: "right" },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 4, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingBottom: 2 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 100, color: "#555", fontSize: 9 },
  value: { flex: 1, fontSize: 9 },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f5f5f5", padding: 4, borderBottomWidth: 1, borderBottomColor: "#999" },
  th: { fontSize: 8, fontWeight: "bold" },
  tableRow: { flexDirection: "row", padding: 4, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  td: { fontSize: 8 },
  totalRow: { flexDirection: "row", padding: 4, borderTopWidth: 1, borderTopColor: "#999", marginTop: 4 },
  totalLabel: { flex: 1, fontSize: 10, fontWeight: "bold", textAlign: "right" },
  totalValue: { width: 100, fontSize: 10, fontWeight: "bold", textAlign: "right" },
  footer: { marginTop: 30 },
  signLine: { borderTopWidth: 0.5, borderTopColor: "#999", width: 120, marginTop: 30 },
  signLabel: { fontSize: 8, color: "#555", marginTop: 2 },
  textBold: { fontWeight: "bold" },
});

type Props = {
  offer: any;
  items: any[];
  company: any;
};

export function OfferPDF({ offer, items, company }: Props) {
  const dateStr = offer.date || "—";
  const validStr = offer.validUntil || "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{company?.companyName || "—"}</Text>
            {company?.companyNameBG && company.companyNameBG !== company.companyName && (
              <Text style={styles.companyDetails}>{company.companyNameBG}</Text>
            )}
            {company?.eik && <Text style={styles.companyDetails}>ЕИК: {company.eik}</Text>}
            {company?.vatNumber && <Text style={styles.companyDetails}>ДДС №: {company.vatNumber}</Text>}
            {company?.address && <Text style={styles.companyDetails}>{company.city ? `${company.city}, ` : ""}{company.address}</Text>}
            {company?.phone && <Text style={styles.companyDetails}>📞 {company.phone}</Text>}
            {company?.email && <Text style={styles.companyDetails}>✉️ {company.email}</Text>}
          </View>
          <View>
            <Text style={styles.title}>ОФЕРТА</Text>
            <Text style={styles.subtitle}>№ {offer.number}</Text>
            <Text style={styles.subtitle}>Дата: {dateStr}</Text>
            <Text style={styles.subtitle}>Валидна до: {validStr}</Text>
          </View>
        </View>

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Клиент</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Име/Фирма:</Text>
            <Text style={styles.value}>{offer.clientCompany || offer.clientName || "—"}</Text>
          </View>
          {offer.clientEik && (
            <View style={styles.row}>
              <Text style={styles.label}>ЕИК:</Text>
              <Text style={styles.value}>{offer.clientEik}</Text>
            </View>
          )}
          {offer.clientVatNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>ДДС №:</Text>
              <Text style={styles.value}>{offer.clientVatNumber}</Text>
            </View>
          )}
          {offer.clientAddress && (
            <View style={styles.row}>
              <Text style={styles.label}>Адрес:</Text>
              <Text style={styles.value}>{offer.clientAddress}</Text>
            </View>
          )}
          {offer.clientPhone && (
            <View style={styles.row}>
              <Text style={styles.label}>Телефон:</Text>
              <Text style={styles.value}>{offer.clientPhone}</Text>
            </View>
          )}
          {offer.clientEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>Имейл:</Text>
              <Text style={styles.value}>{offer.clientEmail}</Text>
            </View>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1 }]}>Описание</Text>
            <Text style={[styles.th, { width: 50, textAlign: "center" }]}>К-во (m³)</Text>
            <Text style={[styles.th, { width: 70, textAlign: "right" }]}>Цена/м³</Text>
            <Text style={[styles.th, { width: 60, textAlign: "right" }]}>Трансп.</Text>
            <Text style={[styles.th, { width: 50, textAlign: "right" }]}>Помпа</Text>
            <Text style={[styles.th, { width: 70, textAlign: "right" }]}>Общо</Text>
          </View>
          {items.map((item: any, i: number) => {
            const desc = item.serviceName || item.concreteTypeName || "—";
            const className = item.concreteTypeClassName ? ` (${item.concreteTypeClassName})` : "";
            return (
              <View style={styles.tableRow} key={i}>
                <Text style={[styles.td, { flex: 1 }]}>{desc}{className}</Text>
                <Text style={[styles.td, { width: 50, textAlign: "center" }]}>{item.quantityM3}</Text>
                <Text style={[styles.td, { width: 70, textAlign: "right" }]}>{item.pricePerM3.toFixed(2)} €</Text>
                <Text style={[styles.td, { width: 60, textAlign: "right" }]}>{(item.transportCost || 0).toFixed(2)}</Text>
                <Text style={[styles.td, { width: 50, textAlign: "right" }]}>{(item.pumpCost || 0).toFixed(2)}</Text>
                <Text style={[styles.td, { width: 70, textAlign: "right" }]}>{item.total.toFixed(2)} €</Text>
              </View>
            );
          })}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Обща стойност: </Text>
            <Text style={styles.totalValue}>{offer.total?.toFixed(2) || "0.00"} €</Text>
          </View>
        </View>

        {/* Notes */}
        {offer.notes && (
          <View style={[styles.section, { marginTop: 12 }]}>
            <Text style={styles.sectionTitle}>Забележки</Text>
            <Text style={{ fontSize: 9 }}>{offer.notes}</Text>
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
              <Text style={styles.signLabel}>Приел: ..............................</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
