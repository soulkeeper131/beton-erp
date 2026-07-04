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
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a", lineHeight: 1.4 },

    // ── HEADER ──
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18, paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: accent },
    logo: { width: 100, height: 45, objectFit: "contain" },
    companyCol: { flex: 1 },
    companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: accent, marginBottom: 2 },
    companyRow: { flexDirection: "row", marginBottom: 1 },
    companyLabel: { fontSize: 9, color: "#999", width: 55 },
    companyValue: { fontSize: 9, color: "#444" },

    // Title block (right side)
    titleCol: { alignItems: "flex-end", marginLeft: 20 },
    titleBig: { fontSize: 20, fontFamily: "Helvetica-Bold", color: accent, textTransform: "uppercase", letterSpacing: 3 },
    titleNum: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#333", marginTop: 4 },
    titleDate: { fontSize: 9, color: "#777", marginTop: 2 },

    // ── CLIENT SECTION ──
    sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: accent, marginBottom: 6, marginTop: 16, textTransform: "uppercase", letterSpacing: 1 },
    clientBox: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 4, padding: 12 },
    clientRow: { flexDirection: "row", marginBottom: 3 },
    clabel: { width: 70, fontSize: 9, color: "#999" },
    cval: { flex: 1, fontSize: 9, color: "#222", fontFamily: "Helvetica-Bold" },

    // ── INFO BAR ──
    infoBar: { flexDirection: "row", gap: 30, marginTop: 14, marginBottom: 6 },
    infoItem: { flexDirection: "row" },
    iLabel: { fontSize: 9, color: "#999", marginRight: 4 },
    iValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },

    // ── TABLE ──
    table: { marginTop: 8 },
    thead: { flexDirection: "row", backgroundColor: accent, paddingVertical: 7, paddingHorizontal: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#fff", textTransform: "uppercase" },
    trow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: "#e8e8e8" },
    trowAlt: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: "#e8e8e8", backgroundColor: "#fafafa" },
    td: { fontSize: 9 },
    tdMono: { fontSize: 9, fontFamily: "Courier" },

    // ── SUMMARY ──
    summaryWrap: { marginTop: 14, alignItems: "flex-end" },
    summaryBox: { width: 220, borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 4, padding: 10 },
    srow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
    slab: { fontSize: 9, color: "#666" },
    sval: { fontSize: 9, fontFamily: "Helvetica-Bold" },
    stotalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTopWidth: 2, borderTopColor: accent },
    stotalLab: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
    stotalVal: { fontSize: 12, fontFamily: "Helvetica-Bold", color: accent },

    // ── NOTES ──
    notesBox: { marginTop: 14, padding: 10, backgroundColor: "#f9f9f9", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: accent },
    notesText: { fontSize: 9, color: "#555" },

    // ── FOOTER ──
    footer: { position: "absolute", bottom: 35, left: 40, right: 40 },
    footLine: { borderTopWidth: 1.5, borderTopColor: accent, marginBottom: 8 },
    footText: { fontSize: 8, color: "#aaa", textAlign: "center", marginBottom: 20 },
    signRow: { flexDirection: "row", justifyContent: "space-between" },
    signCol: { alignItems: "center", width: 140 },
    signLine: { borderTopWidth: 1, borderTopColor: "#ddd", width: "100%", marginBottom: 4 },
    signLab: { fontSize: 8, color: "#999" },
  });

  const subtotal = (items || []).reduce(
    (sum: number, item: any) =>
      sum + (item.quantityM3 || 0) * (item.pricePerM3 || 0) + (item.transportCost || 0) + (item.pumpCost || 0),
    0
  );

  // Separate transport and pump totals
  const transportTotal = (items || []).reduce((sum: number, item: any) => sum + (item.transportCost || 0), 0);
  const pumpTotal = (items || []).reduce((sum: number, item: any) => sum + (item.pumpCost || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ══════════ HEADER ══════════ */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            {hasLogo && <Image src={logoPath} style={styles.logo} />}
            <View style={[styles.companyCol, hasLogo ? { marginLeft: 14 } : {}]}>
              <Text style={styles.companyName}>{c.companyName || "—"}</Text>
              {c.eik && (
                <View style={styles.companyRow}>
                  <Text style={styles.companyLabel}>ЕИК:</Text>
                  <Text style={styles.companyValue}>{c.eik}{c.vatNumber ? ` / ДДС: ${c.vatNumber}` : ""}</Text>
                </View>
              )}
              {c.address && (
                <View style={styles.companyRow}>
                  <Text style={styles.companyLabel}>Адрес:</Text>
                  <Text style={styles.companyValue}>{[c.city, c.address].filter(Boolean).join(", ")}</Text>
                </View>
              )}
              {c.phone && (
                <View style={styles.companyRow}>
                  <Text style={styles.companyLabel}>Телефон:</Text>
                  <Text style={styles.companyValue}>{c.phone}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.titleCol}>
            <Text style={styles.titleBig}>Оферта</Text>
            <Text style={styles.titleNum}>№ {offer.number}</Text>
            <Text style={styles.titleDate}>Дата: {offer.date || "—"}</Text>
            <Text style={styles.titleDate}>Важност: {offer.validUntil || "—"}</Text>
          </View>
        </View>

        {/* ══════════ CLIENT ══════════ */}
        <Text style={styles.sectionTitle}>Данни за клиента</Text>
        <View style={styles.clientBox}>
          <View style={styles.clientRow}>
            <Text style={styles.clabel}>Фирма / Име</Text>
            <Text style={styles.cval}>{offer.clientCompany || offer.clientName || "—"}</Text>
          </View>
          {offer.clientEik && (
            <View style={styles.clientRow}>
              <Text style={styles.clabel}>ЕИК</Text>
              <Text style={styles.cval}>{offer.clientEik}</Text>
            </View>
          )}
          {offer.clientVatNumber && (
            <View style={styles.clientRow}>
              <Text style={styles.clabel}>ДДС №</Text>
              <Text style={styles.cval}>{offer.clientVatNumber}</Text>
            </View>
          )}
          {offer.clientAddress && (
            <View style={styles.clientRow}>
              <Text style={styles.clabel}>Адрес</Text>
              <Text style={styles.cval}>{offer.clientAddress}</Text>
            </View>
          )}
          {(offer.clientPhone || offer.clientEmail) && (
            <View style={styles.clientRow}>
              <Text style={styles.clabel}>Контакт</Text>
              <Text style={styles.cval}>{[offer.clientPhone, offer.clientEmail].filter(Boolean).join(" / ")}</Text>
            </View>
          )}
        </View>

        {/* ══════════ DATES ══════════ */}
        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Text style={styles.iLabel}>Дата на оферта:</Text>
            <Text style={styles.iValue}>{offer.date || "—"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.iLabel}>Валидна до:</Text>
            <Text style={styles.iValue}>{offer.validUntil || "—"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.iLabel}>Статус:</Text>
            <Text style={styles.iValue}>
              {offer.status === "draft" ? "Чернова" : offer.status === "sent" ? "Изпратена" : offer.status === "accepted" ? "Приета" : "Отказана"}
            </Text>
          </View>
        </View>

        {/* ══════════ TABLE ══════════ */}
        <Text style={styles.sectionTitle}>Предмет на офертата</Text>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.thead}>
            <Text style={[styles.th, { flex: 2.5 }]}>Описание</Text>
            <Text style={[styles.th, { width: 55, textAlign: "center" }]}>К-во m³</Text>
            <Text style={[styles.th, { width: 70, textAlign: "right" }]}>Цена/m³</Text>
            <Text style={[styles.th, { width: 65, textAlign: "right" }]}>Транспорт</Text>
            <Text style={[styles.th, { width: 55, textAlign: "right" }]}>Помпа</Text>
            <Text style={[styles.th, { width: 75, textAlign: "right" }]}>Стойност</Text>
          </View>

          {/* Rows */}
          {(items || []).map((item: any, i: number) => {
            const name = item.serviceName || item.concreteTypeName || "—";
            const cls = item.concreteTypeClassName || "";
            const rowTotal = (item.quantityM3 || 0) * (item.pricePerM3 || 0) + (item.transportCost || 0) + (item.pumpCost || 0);
            return (
              <View style={i % 2 === 0 ? styles.trow : styles.trowAlt} key={i}>
                <Text style={[styles.td, { flex: 2.5 }]}>
                  {name}{cls ? ` (${cls})` : ""}
                </Text>
                <Text style={[styles.td, { width: 55, textAlign: "center" }]}>{item.quantityM3}</Text>
                <Text style={[styles.td, { width: 70, textAlign: "right" }]}>{(item.pricePerM3 || 0).toFixed(2)} €</Text>
                <Text style={[styles.td, { width: 65, textAlign: "right" }]}>{(item.transportCost || 0).toFixed(2)} €</Text>
                <Text style={[styles.td, { width: 55, textAlign: "right" }]}>{(item.pumpCost || 0).toFixed(2)} €</Text>
                <Text style={[styles.tdMono, { width: 75, textAlign: "right" }, styles.td]}>{rowTotal.toFixed(2)} €</Text>
              </View>
            );
          })}
        </View>

        {/* ══════════ SUMMARY ══════════ */}
        <View style={styles.summaryWrap}>
          <View style={styles.summaryBox}>
            <View style={styles.srow}>
              <Text style={styles.slab}>Бетон + услуги</Text>
              <Text style={styles.sval}>{subtotal.toFixed(2)} €</Text>
            </View>
            {transportTotal > 0 && (
              <View style={styles.srow}>
                <Text style={styles.slab}>Вкл. транспорт</Text>
                <Text style={styles.sval}>{transportTotal.toFixed(2)} €</Text>
              </View>
            )}
            {pumpTotal > 0 && (
              <View style={styles.srow}>
                <Text style={styles.slab}>Вкл. помпа</Text>
                <Text style={styles.sval}>{pumpTotal.toFixed(2)} €</Text>
              </View>
            )}
            <View style={styles.stotalRow}>
              <Text style={styles.stotalLab}>ОБЩА СТОЙНОСТ</Text>
              <Text style={styles.stotalVal}>{subtotal.toFixed(2)} €</Text>
            </View>
          </View>
        </View>

        {/* ══════════ NOTES ══════════ */}
        {offer.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{offer.notes}</Text>
          </View>
        ) : null}

        {/* ══════════ FOOTER ══════════ */}
        <View style={styles.footer}>
          <View style={styles.footLine} />
          <Text style={styles.footText}>
            {[c.companyName, c.eik ? `ЕИК ${c.eik}` : "", c.city].filter(Boolean).join(" • ")}
            {" — "}Оферта № {offer.number}, валидна до {offer.validUntil || "—"}
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
