import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import path from "path";
import { existsSync } from "fs";

type Props = { pouring: any; company: any };

export function ActPDF({ pouring, company }: Props) {
  const c = company || {};
  const accent = c.accentColor || "#f97316";
  const logoPath = c.logoPath ? path.join(process.cwd(), c.logoPath) : null;
  const hasLogo = logoPath && existsSync(logoPath);

  const styles = StyleSheet.create({
    page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, borderBottomWidth: 2, borderBottomColor: accent, paddingBottom: 10 },
    logo: { width: 80, height: 40, objectFit: "contain" },
    companyInfo: { flex: 1, marginLeft: hasLogo ? 12 : 0 },
    companyName: { fontSize: 13, fontWeight: "bold", color: accent },
    companyDetail: { fontSize: 8, color: "#555", marginTop: 1 },
    titleBlock: { alignItems: "flex-end" },
    title: { fontSize: 16, fontWeight: "bold", color: accent },
    titleSub: { fontSize: 9, color: "#555", marginTop: 2 },
    // Section
    section: { marginBottom: 10 },
    sectionTitle: { fontSize: 10, fontWeight: "bold", color: accent, borderBottomWidth: 1, borderBottomColor: accent, paddingBottom: 3, marginBottom: 6 },
    // Grid
    grid: { flexDirection: "row", flexWrap: "wrap" },
    field: { width: "50%", marginBottom: 7, paddingRight: 10 },
    fieldLabel: { fontSize: 7, color: "#888" },
    fieldValue: { fontSize: 9, fontWeight: "bold", color: "#1a1a1a" },
    // Table
    table: { marginTop: 6 },
    tableHeader: { flexDirection: "row", backgroundColor: accent, padding: 5 },
    th: { fontSize: 7, fontWeight: "bold", color: "#fff" },
    tableRow: { flexDirection: "row", padding: 5, borderBottomWidth: 0.5, borderBottomColor: "#e8e8e8" },
    td: { fontSize: 8 },
    // Footer
    footer: { position: "absolute", bottom: 30, left: 36, right: 36 },
    footerLine: { borderTopWidth: 1, borderTopColor: accent, marginBottom: 6 },
    footerText: { fontSize: 7, color: "#999", textAlign: "center" },
    signBlock: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
    signLine: { borderTopWidth: 0.5, borderTopColor: "#999", width: 110, marginTop: 20 },
    signLabel: { fontSize: 7, color: "#777", marginTop: 2 },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            {hasLogo && <Image src={logoPath} style={styles.logo} />}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{c.companyName || "—"}</Text>
              {c.eik && <Text style={styles.companyDetail}>ЕИК: {c.eik}{c.vatNumber ? ` • ДДС: ${c.vatNumber}` : ""}</Text>}
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>АКТ</Text>
            <Text style={styles.titleSub}>за извършено бетониране</Text>
            <Text style={styles.titleSub}>№ {pouring.id}</Text>
            <Text style={styles.titleSub}>Дата: {pouring.date || "—"}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Данни за обекта и изпълнението</Text>
          <View style={styles.grid}>
            <View style={styles.field}><Text style={styles.fieldLabel}>Обект</Text><Text style={styles.fieldValue}>{pouring.siteName || "—"}</Text>{pouring.siteCity && <Text style={{ fontSize: 7, color: "#888" }}>{pouring.siteCity}</Text>}</View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Клиент</Text><Text style={styles.fieldValue}>{pouring.clientName || "—"}</Text></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Дата на изпълнение</Text><Text style={styles.fieldValue}>{pouring.date || "—"}</Text></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Тип бетон</Text><Text style={styles.fieldValue}>{pouring.concreteTypeName || "—"}</Text></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Количество</Text><Text style={styles.fieldValue}>{pouring.quantityM3 || 0} m³</Text></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Машина (помпа)</Text><Text style={styles.fieldValue}>{pouring.machineName || "—"}</Text></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Метеорологични условия</Text><Text style={styles.fieldValue}>{pouring.weather || "—"}</Text></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Статус</Text><Text style={styles.fieldValue}>{pouring.status === "completed" ? "✅ Изпълнено" : pouring.status === "pending" ? "⏳ Предстои" : pouring.status}</Text></View>
          </View>
        </View>

        {/* Workers */}
        {pouring.workers && pouring.workers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Работници на смяна</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 1 }]}>Име</Text>
                <Text style={[styles.th, { width: 45, textAlign: "center" }]}>Часа</Text>
              </View>
              {pouring.workers.map((w: any, i: number) => (
                <View style={styles.tableRow} key={i}>
                  <Text style={[styles.td, { flex: 1 }]}>{w.workerName || "—"}</Text>
                  <Text style={[styles.td, { width: 45, textAlign: "center" }]}>{w.hours}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {pouring.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Забележки</Text>
            <Text style={{ fontSize: 8, color: "#555" }}>{pouring.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>{c.companyName || ""} • {c.eik ? `ЕИК ${c.eik}` : ""} • {c.city || ""}</Text>
          <View style={styles.signBlock}>
            <View><View style={styles.signLine} /><Text style={styles.signLabel}>Изпълнител: ..............................</Text></View>
            <View><View style={styles.signLine} /><Text style={styles.signLabel}>Възложител: ..............................</Text></View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
