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

type Props = { pouring: any; company: any };

export function ActPDF({ pouring, company }: Props) {
  const c = company || {};
  const logoPath = c.logoPath ? path.join(process.cwd(), c.logoPath) : null;
  const hasLogo = logoPath && existsSync(logoPath);

  const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 9, fontFamily: "DejaVu Sans", color: "#000" },

    title: { textAlign: "center", fontSize: 14, fontWeight: "bold", marginBottom: 4 },
    subtitle: { textAlign: "center", fontSize: 10, marginBottom: 12 },

    partiesRow: { flexDirection: "row", borderWidth: 1, borderColor: "#000", marginBottom: 8 },
    partyLeft: { flex: 1, padding: 6, borderRightWidth: 1, borderColor: "#000" },
    partyRight: { flex: 1, padding: 6 },
    partyLabel: { fontSize: 8, fontWeight: "bold", marginBottom: 4 },
    partyText: { fontSize: 8, marginBottom: 2 },
    logoImg: { width: 70, height: 35, objectFit: "contain", alignSelf: "flex-end", marginBottom: 4 },

    objectRow: { flexDirection: "row", borderWidth: 1, borderColor: "#000", padding: 6, marginBottom: 8 },
    objectLabel: { width: 55, fontSize: 8, fontWeight: "bold" },
    objectValue: { flex: 1, fontSize: 8 },

    table: { marginBottom: 8 },
    thead: { flexDirection: "row", backgroundColor: "#ddd", borderWidth: 1, borderColor: "#000" },
    th: { fontSize: 8, fontWeight: "bold", padding: 4 },
    trow: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000" },
    td: { fontSize: 8, padding: 4 },

    summaryTable: { marginBottom: 10 },
    srow: { flexDirection: "row", borderWidth: 1, borderColor: "#000", borderTopWidth: 0 },
    slab: { width: 130, fontSize: 8, fontWeight: "bold", padding: 4, backgroundColor: "#ddd", borderRightWidth: 1, borderColor: "#000" },
    sval: { flex: 1, fontSize: 8, padding: 4, textAlign: "right", paddingRight: 8 },

    signTitle: { textAlign: "center", fontSize: 8, fontWeight: "bold", marginBottom: 6, marginTop: 6 },
    signTable: { marginTop: 4 },
    signHeader: { flexDirection: "row", backgroundColor: "#ddd", borderWidth: 1, borderColor: "#000" },
    signH: { fontSize: 7, fontWeight: "bold", padding: 3, textAlign: "center" },
    signRow: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000", minHeight: 22 },
    signCell: { fontSize: 7, padding: 3, borderRightWidth: 1, borderColor: "#000" },

    infoRow: { flexDirection: "row", borderWidth: 1, borderColor: "#000", padding: 6, marginBottom: 8 },
    infoLabel: { width: 80, fontSize: 8, fontWeight: "bold" },
    infoValue: { flex: 1, fontSize: 8 },

    notesBox: { marginTop: 8, borderWidth: 1, borderColor: "#000", padding: 6 },
    notesLabel: { fontSize: 7, fontWeight: "bold", marginBottom: 2 },
    notesText: { fontSize: 7, color: "#333" },
  });

  const totalPrice = pouring.totalPrice || 0;
  const vat = totalPrice * 0.20;
  const grandTotal = totalPrice + vat;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        <Text style={styles.title}>ПРОТОКОЛ / АКТ</Text>
        <Text style={styles.subtitle}>за извършено бетониране — № {pouring.id} / {pouring.date || "-"}</Text>

        {/* Parties */}
        <View style={styles.partiesRow}>
          <View style={styles.partyLeft}>
            <Text style={styles.partyLabel}>ВЪЗЛОЖИТЕЛ:</Text>
            <Text style={styles.partyText}>{pouring.clientName || "-"}</Text>
          </View>
          <View style={styles.partyRight}>
            <Text style={styles.partyLabel}>ИЗПЪЛНИТЕЛ:</Text>
            {hasLogo ? <Image src={logoPath!} style={styles.logoImg} /> : null}
            <Text style={styles.partyText}>{c.companyName || "-"}</Text>
            {c.eik ? <Text style={styles.partyText}>ЕИК: {c.eik}</Text> : null}
            {c.vatNumber ? <Text style={styles.partyText}>ИН по ЗДДС: {c.vatNumber}</Text> : null}
            {c.address ? <Text style={styles.partyText}>{[c.city, c.address].filter(Boolean).join(", ")}</Text> : null}
          </View>
        </View>

        {/* Object */}
        <View style={styles.objectRow}>
          <Text style={styles.objectLabel}>ОБЕКТ:</Text>
          <Text style={styles.objectValue}>{pouring.siteName || "-"}{pouring.siteCity ? `, ${pouring.siteCity}` : ""}</Text>
        </View>

        {/* Info */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Машина (помпа):</Text>
          <Text style={styles.infoValue}>{pouring.machineName || "-"}</Text>
          <Text style={styles.infoLabel}>Време:</Text>
          <Text style={styles.infoValue}>{pouring.weather || "-"}</Text>
        </View>

        {/* Items Table */}
        {(pouring.items || []).length > 0 ? (
          <View style={styles.table}>
            <View style={styles.thead}>
              <Text style={[styles.th, { width: 24, textAlign: "center" }]}>№</Text>
              <Text style={[styles.th, { flex: 1 }]}>Тип бетон</Text>
              <Text style={[styles.th, { width: 50, textAlign: "center" }]}>К-во m³</Text>
              <Text style={[styles.th, { width: 58, textAlign: "right" }]}>Цена/m³</Text>
              <Text style={[styles.th, { width: 70, textAlign: "right" }]}>Общо</Text>
            </View>
            {pouring.items.map((item: any, i: number) => (
              <View style={styles.trow} key={i} wrap={false}>
                <Text style={[styles.td, { width: 24, textAlign: "center" }]}>{i + 1}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{item.concreteTypeName || "-"}</Text>
                <Text style={[styles.td, { width: 50, textAlign: "center" }]}>{item.quantityM3 || 0}</Text>
                <Text style={[styles.td, { width: 58, textAlign: "right" }]}>{(item.pricePerM3 || 0).toFixed(2)} лв</Text>
                <Text style={[styles.td, { width: 70, textAlign: "right" }]}>{(item.total || 0).toFixed(2)} лв</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Количество:</Text>
            <Text style={styles.infoValue}>{pouring.totalQty || 0} m³</Text>
          </View>
        )}

        {/* Summary */}
        <View style={styles.summaryTable}>
          <View style={styles.srow}>
            <Text style={styles.slab}>ОБЩА СУМА:</Text>
            <Text style={styles.sval}>{totalPrice.toFixed(2)} лв</Text>
          </View>
          <View style={styles.srow}>
            <Text style={styles.slab}>ДДС 20%:</Text>
            <Text style={styles.sval}>{vat.toFixed(2)} лв</Text>
          </View>
          <View style={styles.srow}>
            <Text style={[styles.slab, { fontWeight: "bold" }]}>КРАЙНА СУМА:</Text>
            <Text style={[styles.sval, { fontWeight: "bold" }]}>{grandTotal.toFixed(2)} лв</Text>
          </View>
        </View>

        {/* Workers */}
        {pouring.workers && pouring.workers.length > 0 ? (
          <>
            <View style={styles.table}>
              <View style={styles.thead}>
                <Text style={[styles.th, { flex: 1 }]}>Работник</Text>
                <Text style={[styles.th, { width: 55, textAlign: "center" }]}>Часа</Text>
              </View>
              {pouring.workers.map((w: any, i: number) => (
                <View style={styles.trow} key={i} wrap={false}>
                  <Text style={[styles.td, { flex: 1 }]}>{w.workerName || "-"}</Text>
                  <Text style={[styles.td, { width: 55, textAlign: "center" }]}>{w.hours}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Notes */}
        {pouring.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Забележки:</Text>
            <Text style={styles.notesText}>{pouring.notes}</Text>
          </View>
        ) : null}

        {/* Signatures */}
        <Text style={styles.signTitle}>ПОДПИСИ НА СТРАНИТЕ</Text>
        <View style={styles.signTable}>
          <View style={styles.signHeader}>
            <Text style={[styles.signH, { flex: 1 }]}>ЗА ВЪЗЛОЖИТЕЛЯ-ПРИЕЛ:</Text>
            <Text style={[styles.signH, { flex: 1 }]}>ЗА ИЗПЪЛНИТЕЛЯ-ПРЕДАЛ:</Text>
          </View>
          {["Име:", "Длъжност:", "Дата:", "Подпис:"].map((label, idx) => (
            <View style={styles.signRow} key={idx}>
              <Text style={[styles.signCell, { width: 80 }]}>{label}</Text>
              <Text style={[styles.signCell, { flex: 1 }]}></Text>
              <Text style={[styles.signCell, { width: 80 }]}>{label}</Text>
              <Text style={[styles.signCell, { flex: 1, borderRightWidth: 0 }]}></Text>
            </View>
          ))}
        </View>

      </Page>
    </Document>
  );
}
