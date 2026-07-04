import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import path from "path";
import { existsSync } from "fs";

type Props = { offer: any; items: any[]; company: any };

export function OfferPDF({ offer, items, company }: Props) {
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
    // Client section
    section: { marginBottom: 10 },
    sectionTitle: { fontSize: 10, fontWeight: "bold", color: accent, borderBottomWidth: 1, borderBottomColor: accent, paddingBottom: 3, marginBottom: 6 },
    fieldRow: { flexDirection: "row", marginBottom: 3 },
    fieldLabel: { width: 80, color: "#888", fontSize: 8 },
    fieldValue: { flex: 1, fontSize: 8 },
    // Table
    table: { marginTop: 6 },
    tableHeader: { flexDirection: "row", backgroundColor: accent, padding: 5, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
    th: { fontSize: 7, fontWeight: "bold", color: "#fff" },
    tableRow: { flexDirection: "row", padding: 5, borderBottomWidth: 0.5, borderBottomColor: "#e8e8e8" },
    tableRowAlt: { flexDirection: "row", padding: 5, borderBottomWidth: 0.5, borderBottomColor: "#e8e8e8", backgroundColor: "#fafafa" },
    td: { fontSize: 8 },
    // Total
    totalRow: { flexDirection: "row", padding: 6, borderTopWidth: 1.5, borderTopColor: accent, marginTop: 6, backgroundColor: "#fff8f5" },
    totalLabel: { flex: 1, fontSize: 10, fontWeight: "bold", textAlign: "right", color: "#1a1a1a" },
    totalValue: { width: 100, fontSize: 10, fontWeight: "bold", textAlign: "right", color: accent },
    // Footer
    footer: { position: "absolute", bottom: 30, left: 36, right: 36 },
    footerLine: { borderTopWidth: 1, borderTopColor: accent, marginBottom: 6 },
    footerText: { fontSize: 7, color: "#999", textAlign: "center" },
    signBlock: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
    signLine: { borderTopWidth: 0.5, borderTopColor: "#999", width: 110, marginTop: 20 },
    signLabel: { fontSize: 7, color: "#777", marginTop: 2 },
    // Notes
    notesBox: { marginTop: 10, padding: 8, backgroundColor: "#f8f8f8", borderRadius: 3 },
    notesText: { fontSize: 8, color: "#555" },
  });

  const offerTotal = (items || []).reduce(
    (sum: number, item: any) => sum + ((item.quantityM3 || 0) * (item.pricePerM3 || 0) + (item.transportCost || 0) + (item.pumpCost || 0)),
    0
  );

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
              {c.phone && <Text style={styles.companyDetail}>📞 {c.phone}</Text>}
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>ОФЕРТА</Text>
            <Text style={styles.titleSub}>№ {offer.number}</Text>
            <Text style={styles.titleSub}>Дата: {offer.date || "—"}</Text>
            <Text style={styles.titleSub}>Валидна до: {offer.validUntil || "—"}</Text>
          </View>
        </View>

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Клиент</Text>
          <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Име / Фирма:</Text><Text style={styles.fieldValue}>{offer.clientCompany || offer.clientName || "—"}</Text></View>
          {offer.clientEik && <View style={styles.fieldRow}><Text style={styles.fieldLabel}>ЕИК:</Text><Text style={styles.fieldValue}>{offer.clientEik}</Text></View>}
          {offer.clientVatNumber && <View style={styles.fieldRow}><Text style={styles.fieldLabel}>ДДС №:</Text><Text style={styles.fieldValue}>{offer.clientVatNumber}</Text></View>}
          {offer.clientAddress && <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Адрес:</Text><Text style={styles.fieldValue}>{offer.clientAddress}</Text></View>}
          {offer.clientPhone && <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Телефон:</Text><Text style={styles.fieldValue}>{offer.clientPhone}</Text></View>}
          {offer.clientEmail && <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Имейл:</Text><Text style={styles.fieldValue}>{offer.clientEmail}</Text></View>}
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Описание</Text>
            <Text style={[styles.th, { width: 45, textAlign: "center" }]}>К-во</Text>
            <Text style={[styles.th, { width: 60, textAlign: "right" }]}>Цена/м³</Text>
            <Text style={[styles.th, { width: 55, textAlign: "right" }]}>Трансп.</Text>
            <Text style={[styles.th, { width: 45, textAlign: "right" }]}>Помпа</Text>
            <Text style={[styles.th, { width: 65, textAlign: "right" }]}>Общо</Text>
          </View>
          {items.map((item: any, i: number) => {
            const desc = item.serviceName || item.concreteTypeName || "—";
            const cls = item.concreteTypeClassName ? ` (${item.concreteTypeClassName})` : "";
            const rowTotal = (item.quantityM3 || 0) * (item.pricePerM3 || 0) + (item.transportCost || 0) + (item.pumpCost || 0);
            return (
              <View style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={i}>
                <Text style={[styles.td, { flex: 2 }]}>{desc}{cls}</Text>
                <Text style={[styles.td, { width: 45, textAlign: "center" }]}>{item.quantityM3} m³</Text>
                <Text style={[styles.td, { width: 60, textAlign: "right" }]}>{item.pricePerM3.toFixed(2)} €</Text>
                <Text style={[styles.td, { width: 55, textAlign: "right" }]}>{(item.transportCost || 0).toFixed(2)}</Text>
                <Text style={[styles.td, { width: 45, textAlign: "right" }]}>{(item.pumpCost || 0).toFixed(2)}</Text>
                <Text style={[styles.td, { width: 65, textAlign: "right" }]}>{rowTotal.toFixed(2)} €</Text>
              </View>
            );
          })}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Обща стойност: </Text>
            <Text style={styles.totalValue}>{offerTotal.toFixed(2)} €</Text>
          </View>
        </View>

        {/* Notes */}
        {offer.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>📝 {offer.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>{c.companyName || ""} • {c.eik ? `ЕИК ${c.eik}` : ""} • {c.city || ""} • Офертата е валидна до {offer.validUntil || "—"}</Text>
          <View style={styles.signBlock}>
            <View><View style={styles.signLine} /><Text style={styles.signLabel}>Изготвил: ..............................</Text></View>
            <View><View style={styles.signLine} /><Text style={styles.signLabel}>Приел: ..............................</Text></View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
