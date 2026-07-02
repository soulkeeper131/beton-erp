import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  companyName: { fontSize: 14, fontWeight: "bold" },
  companyDetails: { fontSize: 8, color: "#555", marginTop: 1 },
  title: { fontSize: 18, fontWeight: "bold", textAlign: "right" },
  subtitle: { fontSize: 9, color: "#555", textAlign: "right", marginTop: 1 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingBottom: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  field: { width: "50%", marginBottom: 6 },
  fieldLabel: { fontSize: 8, color: "#555" },
  fieldValue: { fontSize: 9, fontWeight: "bold" },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f5f5f5", padding: 4, borderBottomWidth: 1 },
  th: { fontSize: 8, fontWeight: "bold" },
  tableRow: { flexDirection: "row", padding: 4, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  td: { fontSize: 8 },
  footer: { marginTop: 30 },
  signLine: { borderTopWidth: 0.5, borderTopColor: "#999", width: 120, marginTop: 30 },
  signLabel: { fontSize: 8, color: "#555", marginTop: 2 },
});

type Props = { pouring: any; company: any };

export function ActPDF({ pouring, company }: Props) {
  const c = company || {};
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{c.companyName || "—"}</Text>
            {c.eik && <Text style={styles.companyDetails}>ЕИК: {c.eik}</Text>}
            {c.vatNumber && <Text style={styles.companyDetails}>ДДС №: {c.vatNumber}</Text>}
          </View>
          <View>
            <Text style={styles.title}>АКТ</Text>
            <Text style={styles.subtitle}>за извършено бетониране</Text>
            <Text style={styles.subtitle}>№ {pouring.id}</Text>
            <Text style={styles.subtitle}>Дата: {pouring.date || "—"}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Данни за обекта и изпълнението</Text>
          <View style={styles.grid}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Обект</Text>
              <Text style={styles.fieldValue}>{pouring.siteName || "—"}</Text>
              {pouring.siteCity && <Text style={{ fontSize: 8, color: "#555" }}>{pouring.siteCity}</Text>}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Клиент</Text>
              <Text style={styles.fieldValue}>{pouring.clientName || "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Дата на изпълнение</Text>
              <Text style={styles.fieldValue}>{pouring.date || "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Тип бетон</Text>
              <Text style={styles.fieldValue}>{pouring.concreteTypeName || "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Количество</Text>
              <Text style={styles.fieldValue}>{pouring.quantityM3 || 0} m³</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Машина (помпа)</Text>
              <Text style={styles.fieldValue}>{pouring.machineName || "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Метеорологични условия</Text>
              <Text style={styles.fieldValue}>{pouring.weather || "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Статус</Text>
              <Text style={styles.fieldValue}>
                {pouring.status === "completed" ? "Изпълнено" : pouring.status === "pending" ? "Предстои" : pouring.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {pouring.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Забележки</Text>
            <Text style={{ fontSize: 9 }}>{pouring.notes}</Text>
          </View>
        )}

        {/* Workers & Materials if available */}
        {pouring.workers && pouring.workers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Работници на смяна</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 1 }]}>Име</Text>
                <Text style={[styles.th, { width: 50, textAlign: "center" }]}>Часове</Text>
              </View>
              {pouring.workers.map((w: any, i: number) => (
                <View style={styles.tableRow} key={i}>
                  <Text style={[styles.td, { flex: 1 }]}>{w.workerName || "—"}</Text>
                  <Text style={[styles.td, { width: 50, textAlign: "center" }]}>{w.hours}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.footer}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>Изпълнител: ..............................</Text>
            </View>
            <View>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>Възложител: ..............................</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
