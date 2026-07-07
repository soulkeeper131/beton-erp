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

type Props = { offer: any; items: any[]; company: any };

export function OfferPDF({ offer, items, company }: Props) {
  const c = company || {};
  const logoPath = c.logoPath ? path.join(process.cwd(), c.logoPath) : null;
  const hasLogo = logoPath && existsSync(logoPath);

  const styles = StyleSheet.create({
    page: { padding: 30, fontSize: 9, fontFamily: "DejaVu Sans", color: "#000" },

    // ═══ TITLE ═══
    title: { textAlign: "center", fontSize: 14, fontWeight: "bold", marginBottom: 4 },
    subtitle: { textAlign: "center", fontSize: 10, marginBottom: 12 },

    // ═══ PARTIES (two-column) ═══
    partiesRow: { flexDirection: "row", borderWidth: 1, borderColor: "#000", marginBottom: 8 },
    partyLeft: { flex: 1, padding: 6, borderRightWidth: 1, borderColor: "#000" },
    partyRight: { flex: 1, padding: 6 },
    partyLabel: { fontSize: 8, fontWeight: "bold", marginBottom: 4 },
    partyText: { fontSize: 8, marginBottom: 2 },
    logoImg: { width: 70, height: 35, objectFit: "contain", alignSelf: "flex-end", marginBottom: 4 },

    // ═══ OBJECT ═══
    objectRow: { flexDirection: "row", borderWidth: 1, borderColor: "#000", padding: 6, marginBottom: 8 },
    objectLabel: { width: 55, fontSize: 8, fontWeight: "bold" },
    objectValue: { flex: 1, fontSize: 8 },

    // ═══ TABLE ═══
    table: { marginBottom: 8 },
    thead: { flexDirection: "row", backgroundColor: "#ddd", borderWidth: 1, borderColor: "#000" },
    th: { fontSize: 8, fontWeight: "bold", padding: 4 },
    trow: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000" },
    td: { fontSize: 8, padding: 4 },

    // ═══ SUMMARY ═══
    summaryTable: { marginBottom: 10 },
    srow: { flexDirection: "row", borderWidth: 1, borderColor: "#000", borderTopWidth: 0 },
    slab: { width: 130, fontSize: 8, fontWeight: "bold", padding: 4, backgroundColor: "#ddd", borderRightWidth: 1, borderColor: "#000" },
    sval: { flex: 1, fontSize: 8, padding: 4, textAlign: "right", paddingRight: 8 },

    // ═══ SIGNATURES ═══
    signTitle: { textAlign: "center", fontSize: 8, fontWeight: "bold", marginBottom: 6, marginTop: 6 },
    signTable: { marginTop: 4 },
    signHeader: { flexDirection: "row", backgroundColor: "#ddd", borderWidth: 1, borderColor: "#000" },
    signH: { fontSize: 7, fontWeight: "bold", padding: 3, textAlign: "center" },
    signRow: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000", minHeight: 22 },
    signCell: { fontSize: 7, padding: 3, borderRightWidth: 1, borderColor: "#000" },

    // ═══ NOTES ═══
    notesBox: { marginTop: 8, borderWidth: 1, borderColor: "#000", padding: 6 },
    notesLabel: { fontSize: 7, fontWeight: "bold", marginBottom: 2 },
    notesText: { fontSize: 7, color: "#333" },
  });

  const subtotal = (items || []).reduce(
    (sum: number, item: any) =>
      sum + (item.quantityM3 || 0) * (item.pricePerM3 || 0) + (item.transportCost || 0) + (item.pumpCost || 0),
    0
  );

  const transportTotal = (items || []).reduce((sum: number, item: any) => sum + (item.transportCost || 0), 0);
  const pumpTotal = (items || []).reduce((sum: number, item: any) => sum + (item.pumpCost || 0), 0);
  const netTotal = subtotal - transportTotal - pumpTotal;
  const vat = netTotal * 0.20;
  const grandTotal = netTotal + vat;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ═══ TITLE ═══ */}
        <Text style={styles.title}>ОФЕРТА</Text>
        <Text style={styles.subtitle}>№ {offer.number} / {offer.date || "-"}{offer.validUntil ? ` — валидна до ${offer.validUntil}` : ""}</Text>

        {/* ═══ PARTIES ═══ */}
        <View style={styles.partiesRow}>
          <View style={styles.partyLeft}>
            <Text style={styles.partyLabel}>ВЪЗЛОЖИТЕЛ:</Text>
            <Text style={styles.partyText}>{offer.clientCompany || offer.clientName || "-"}</Text>
            {offer.clientEik ? <Text style={styles.partyText}>ЕИК: {offer.clientEik}</Text> : null}
            {offer.clientVatNumber ? <Text style={styles.partyText}>ИН по ЗДДС: {offer.clientVatNumber}</Text> : null}
            {offer.clientAddress ? <Text style={styles.partyText}>{offer.clientAddress}</Text> : null}
            {offer.clientPhone ? <Text style={styles.partyText}>Тел: {offer.clientPhone}</Text> : null}
          </View>
          <View style={styles.partyRight}>
            <Text style={styles.partyLabel}>ИЗПЪЛНИТЕЛ:</Text>
            {hasLogo ? <Image src={logoPath!} style={styles.logoImg} /> : null}
            <Text style={styles.partyText}>{c.companyName || "-"}</Text>
            {c.eik ? <Text style={styles.partyText}>ЕИК: {c.eik}</Text> : null}
            {c.vatNumber ? <Text style={styles.partyText}>ИН по ЗДДС: {c.vatNumber}</Text> : null}
            {c.address ? <Text style={styles.partyText}>{[c.city, c.address].filter(Boolean).join(", ")}</Text> : null}
            {c.phone ? <Text style={styles.partyText}>Тел: {c.phone}</Text> : null}
          </View>
        </View>

        {/* ═══ OBJECT ═══ */}
        {offer.siteName ? (
          <View style={styles.objectRow}>
            <Text style={styles.objectLabel}>ОБЕКТ:</Text>
            <Text style={styles.objectValue}>{offer.siteName}{offer.siteCity ? `, ${offer.siteCity}` : ""}</Text>
          </View>
        ) : null}

        {/* ═══ TABLE ═══ */}
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: 24, textAlign: "center" }]}>№</Text>
            <Text style={[styles.th, { flex: 1 }]}>Описание на СМР</Text>
            <Text style={[styles.th, { width: 44, textAlign: "center" }]}>Мярка</Text>
            <Text style={[styles.th, { width: 50, textAlign: "center" }]}>К-во</Text>
            <Text style={[styles.th, { width: 58, textAlign: "right" }]}>Цена</Text>
            <Text style={[styles.th, { width: 70, textAlign: "right" }]}>Общо</Text>
          </View>
          {(items || []).map((item: any, i: number) => {
            const name = item.serviceName || item.concreteTypeName || "-";
            const cls = item.concreteTypeClassName || "";
            const rowTotal = (item.quantityM3 || 0) * (item.pricePerM3 || 0) + (item.transportCost || 0) + (item.pumpCost || 0);
            let desc = name + (cls ? ` (${cls})` : "");
            if (item.transportCost > 0) desc += `\nвкл. транспорт`;
            if (item.pumpCost > 0) desc += `\nвкл. помпа`;
            return (
              <View style={styles.trow} key={i} wrap={false}>
                <Text style={[styles.td, { width: 24, textAlign: "center" }]}>{i + 1}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{desc}</Text>
                <Text style={[styles.td, { width: 44, textAlign: "center" }]}>m³</Text>
                <Text style={[styles.td, { width: 50, textAlign: "center" }]}>{item.quantityM3}</Text>
                <Text style={[styles.td, { width: 58, textAlign: "right" }]}>{(item.pricePerM3 || 0).toFixed(2)} €</Text>
                <Text style={[styles.td, { width: 70, textAlign: "right" }]}>{rowTotal.toFixed(2)} €</Text>
              </View>
            );
          })}
        </View>

        {/* ═══ SUMMARY ═══ */}
        <View style={styles.summaryTable}>
          <View style={styles.srow}>
            <Text style={styles.slab}>ОБЩА СУМА:</Text>
            <Text style={styles.sval}>{netTotal.toFixed(2)} €</Text>
          </View>
          <View style={styles.srow}>
            <Text style={styles.slab}>ДДС 20%:</Text>
            <Text style={styles.sval}>{vat.toFixed(2)} €</Text>
          </View>
          <View style={styles.srow}>
            <Text style={[styles.slab, { fontWeight: "bold" }]}>КРАЙНА СУМА:</Text>
            <Text style={[styles.sval, { fontWeight: "bold" }]}>{grandTotal.toFixed(2)} €</Text>
          </View>
          <View style={styles.srow}>
            <Text style={styles.slab}>СУМА ЗА ПЛАЩАНЕ:</Text>
            <Text style={[styles.sval, { fontWeight: "bold" }]}>{grandTotal.toFixed(2)} €</Text>
          </View>
        </View>

        {/* ═══ NOTES ═══ */}
        {offer.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Забележки:</Text>
            <Text style={styles.notesText}>{offer.notes}</Text>
          </View>
        ) : null}

        {/* ═══ SIGNATURES ═══ */}
        <Text style={styles.signTitle}>ПОДПИСИ НА СТРАНИТЕ</Text>
        <View style={styles.signTable}>
          <View style={styles.signHeader}>
            <Text style={[styles.signH, { flex: 1 }]}>ЗА ВЪЗЛОЖИТЕЛЯ:</Text>
            <Text style={[styles.signH, { flex: 1 }]}>ЗА ИЗПЪЛНИТЕЛЯ:</Text>
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
