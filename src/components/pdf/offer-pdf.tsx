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
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#1a1a1a",
    },

    // ── HEADER ──
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
      paddingBottom: 14,
      borderBottomWidth: 3,
      borderBottomColor: accent,
    },
    logo: { width: 100, height: 45, objectFit: "contain" },
    companyCol: { flex: 1, paddingRight: 10 },
    companyName: { fontSize: 14, fontWeight: "bold", color: accent, marginBottom: 4 },
    companyRow: { flexDirection: "row", marginBottom: 3, alignItems: "flex-start" },
    companyLabel: { fontSize: 9, color: "#aaa", width: 55, flexShrink: 0 },
    companyValue: { fontSize: 9, color: "#444", flex: 1 },

    // Title block (right side)
    titleCol: { alignItems: "flex-end", flexShrink: 0, minWidth: 120 },
    titleBig: { fontSize: 22, fontWeight: "bold", color: accent, marginBottom: 8 },
    titleNum: { fontSize: 11, fontWeight: "bold", color: "#333", marginBottom: 8 },
    titleDateRow: { flexDirection: "row", marginBottom: 3, justifyContent: "flex-end" },
    titleDateLabel: { fontSize: 9, color: "#aaa", marginRight: 4 },
    titleDateValue: { fontSize: 9, fontWeight: "bold", color: "#333" },

    // ── CLIENT ──
    sectionTitle: {
      fontSize: 10,
      fontWeight: "bold",
      color: accent,
      marginBottom: 8,
      marginTop: 18,
    },
    clientBox: { borderWidth: 1, borderColor: "#ddd", borderRadius: 4, padding: 12 },
    clientRow: { flexDirection: "row", marginBottom: 5, alignItems: "flex-start" },
    clabel: { width: 70, fontSize: 9, color: "#aaa", flexShrink: 0 },
    cval: { flex: 1, fontSize: 9, color: "#222", fontWeight: "bold" },

    // ── TABLE ──
    table: { marginTop: 10 },
    thead: {
      flexDirection: "row",
      backgroundColor: accent,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 8,
      paddingRight: 8,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    },
    th: { fontSize: 8, fontWeight: "bold", color: "#fff" },
    trow: {
      flexDirection: "row",
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 8,
      paddingRight: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    },
    trowAlt: {
      flexDirection: "row",
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 8,
      paddingRight: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
      backgroundColor: "#f9f9f9",
    },
    td: { fontSize: 9 },

    // ── SUMMARY ──
    summaryWrap: { marginTop: 16, alignItems: "flex-end" },
    summaryBox: { width: 220, borderWidth: 1, borderColor: "#ddd", borderRadius: 4, padding: 10 },
    srow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    slab: { fontSize: 9, color: "#666" },
    sval: { fontSize: 9, fontWeight: "bold" },
    stotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 2,
      borderTopColor: accent,
    },
    stotalLab: { fontSize: 12, fontWeight: "bold" },
    stotalVal: { fontSize: 12, fontWeight: "bold", color: accent },

    // ── NOTES ──
    notesBox: {
      marginTop: 16,
      padding: 10,
      backgroundColor: "#f9f9f9",
      borderRadius: 4,
      borderLeftWidth: 3,
      borderLeftColor: accent,
    },
    notesText: { fontSize: 9, color: "#666" },

    // ── FOOTER ──
    footer: { position: "absolute", bottom: 35, left: 40, right: 40 },
    footLine: { borderTopWidth: 1.5, borderTopColor: accent, marginBottom: 10 },
    footText: { fontSize: 8, color: "#bbb", textAlign: "center", marginBottom: 22 },
    signRow: { flexDirection: "row", justifyContent: "space-between" },
    signCol: { alignItems: "center", width: 140 },
    signLine: { borderTopWidth: 1, borderTopColor: "#ddd", width: "100%", marginBottom: 4 },
    signLab: { fontSize: 8, color: "#aaa" },
  });

  const subtotal = (items || []).reduce(
    (sum: number, item: any) =>
      sum + (item.quantityM3 || 0) * (item.pricePerM3 || 0) + (item.transportCost || 0) + (item.pumpCost || 0),
    0
  );

  const transportTotal = (items || []).reduce((sum: number, item: any) => sum + (item.transportCost || 0), 0);
  const pumpTotal = (items || []).reduce((sum: number, item: any) => sum + (item.pumpCost || 0), 0);

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

          {/* Right side — clean title block */}
          <View style={styles.titleCol}>
            <Text style={styles.titleBig}>ОФЕРТА</Text>
            <Text style={styles.titleNum}>№ {offer.number}</Text>
            <View style={styles.titleDateRow}>
              <Text style={styles.titleDateLabel}>Дата:</Text>
              <Text style={styles.titleDateValue}>{offer.date || "-"}</Text>
            </View>
            <View style={styles.titleDateRow}>
              <Text style={styles.titleDateLabel}>Важност:</Text>
              <Text style={styles.titleDateValue}>{offer.validUntil || "-"}</Text>
            </View>
          </View>
        </View>

        {/* ═══ CLIENT ═══ */}
        <Text style={styles.sectionTitle}>Данни за клиента</Text>
        <View style={styles.clientBox}>
          <View style={styles.clientRow}>
            <Text style={styles.clabel}>Фирма / Име</Text>
            <Text style={styles.cval}>{offer.clientCompany || offer.clientName || "-"}</Text>
          </View>
          {offer.clientEik ? (
            <View style={styles.clientRow}>
              <Text style={styles.clabel}>ЕИК</Text>
              <Text style={styles.cval}>{offer.clientEik}</Text>
            </View>
          ) : null}
          {offer.clientVatNumber ? (
            <View style={styles.clientRow}>
              <Text style={styles.clabel}>ДДС №</Text>
              <Text style={styles.cval}>{offer.clientVatNumber}</Text>
            </View>
          ) : null}
          {offer.clientAddress ? (
            <View style={styles.clientRow}>
              <Text style={styles.clabel}>Адрес</Text>
              <Text style={styles.cval}>{offer.clientAddress}</Text>
            </View>
          ) : null}
          {offer.clientPhone || offer.clientEmail ? (
            <View style={styles.clientRow}>
              <Text style={styles.clabel}>Контакт</Text>
              <Text style={styles.cval}>
                {[offer.clientPhone, offer.clientEmail].filter(Boolean).join(" / ")}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ═══ TABLE ═══ */}
        <Text style={styles.sectionTitle}>Предмет на офертата</Text>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { flex: 3 }]}>Описание</Text>
            <Text style={[styles.th, { width: 55, textAlign: "center" }]}>К-во m³</Text>
            <Text style={[styles.th, { width: 70, textAlign: "right" }]}>Цена/m³</Text>
            <Text style={[styles.th, { width: 65, textAlign: "right" }]}>Трансп.</Text>
            <Text style={[styles.th, { width: 55, textAlign: "right" }]}>Помпа</Text>
            <Text style={[styles.th, { width: 70, textAlign: "right" }]}>Стойност</Text>
          </View>

          {(items || []).map((item: any, i: number) => {
            const name = item.serviceName || item.concreteTypeName || "-";
            const cls = item.concreteTypeClassName || "";
            const rowTotal =
              (item.quantityM3 || 0) * (item.pricePerM3 || 0) +
              (item.transportCost || 0) +
              (item.pumpCost || 0);
            return (
              <View style={i % 2 === 0 ? styles.trow : styles.trowAlt} key={i} wrap={false}>
                <Text style={[styles.td, { flex: 3 }]}>
                  {name}{cls ? ` (${cls})` : ""}
                </Text>
                <Text style={[styles.td, { width: 55, textAlign: "center" }]}>
                  {item.quantityM3}
                </Text>
                <Text style={[styles.td, { width: 70, textAlign: "right" }]}>
                  {(item.pricePerM3 || 0).toFixed(2)} €
                </Text>
                <Text style={[styles.td, { width: 65, textAlign: "right" }]}>
                  {(item.transportCost || 0).toFixed(2)} €
                </Text>
                <Text style={[styles.td, { width: 55, textAlign: "right" }]}>
                  {(item.pumpCost || 0).toFixed(2)} €
                </Text>
                <Text style={[styles.td, { width: 70, textAlign: "right", fontWeight: "bold" }]}>
                  {rowTotal.toFixed(2)} €
                </Text>
              </View>
            );
          })}
        </View>

        {/* ═══ SUMMARY ═══ */}
        <View style={styles.summaryWrap}>
          <View style={styles.summaryBox}>
            <View style={styles.srow}>
              <Text style={styles.slab}>Бетон + услуги</Text>
              <Text style={styles.sval}>{subtotal.toFixed(2)} €</Text>
            </View>
            {transportTotal > 0 ? (
              <View style={styles.srow}>
                <Text style={styles.slab}>в т.ч. транспорт</Text>
                <Text style={styles.sval}>{transportTotal.toFixed(2)} €</Text>
              </View>
            ) : null}
            {pumpTotal > 0 ? (
              <View style={styles.srow}>
                <Text style={styles.slab}>в т.ч. помпа</Text>
                <Text style={styles.sval}>{pumpTotal.toFixed(2)} €</Text>
              </View>
            ) : null}
            <View style={styles.stotalRow}>
              <Text style={styles.stotalLab}>ОБЩА СТОЙНОСТ</Text>
              <Text style={styles.stotalVal}>{subtotal.toFixed(2)} €</Text>
            </View>
          </View>
        </View>

        {/* ═══ NOTES ═══ */}
        {offer.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{offer.notes}</Text>
          </View>
        ) : null}

        {/* ═══ FOOTER ═══ */}
        <View style={styles.footer}>
          <View style={styles.footLine} />
          <Text style={styles.footText}>
            {[c.companyName, c.eik ? `ЕИК ${c.eik}` : "", c.city]
              .filter(Boolean)
              .join("  •  ")}
            {"  —  "}Оферта № {offer.number}, валидна до {offer.validUntil || "..."}
          </Text>
          <View style={styles.signRow}>
            <View style={styles.signCol}>
              <View style={styles.signLine} />
              <Text style={styles.signLab}>Изготвил: ________________________</Text>
            </View>
            <View style={styles.signCol}>
              <View style={styles.signLine} />
              <Text style={styles.signLab}>Приел: ________________________</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}
