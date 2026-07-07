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

type Props = { pouring: any; company: any };

export function ActPDF({ pouring, company }: Props) {
  const c = company || {};
  const accent = c.accentColor || "#f97316";
  const logoPath = c.logoPath ? path.join(process.cwd(), c.logoPath) : null;
  const hasLogo = logoPath && existsSync(logoPath);

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "DejaVu Sans", color: "#1a1a1a" },

    // ── HEADER ──
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, paddingBottom: 14, borderBottomWidth: 3, borderBottomColor: accent },
    logo: { width: 100, height: 45, objectFit: "contain" },
    companyCol: { flex: 1, paddingRight: 10 },
    companyName: { fontSize: 14, fontWeight: "bold", color: accent, marginBottom: 4 },
    companyRow: { flexDirection: "row", marginBottom: 3, alignItems: "flex-start" },
    companyLabel: { fontSize: 9, color: "#aaa", width: 55, flexShrink: 0 },
    companyValue: { fontSize: 9, color: "#444", flex: 1 },

    // Title
    titleCol: { alignItems: "flex-end", flexShrink: 0, minWidth: 120 },
    titleBig: { fontSize: 20, fontWeight: "bold", color: accent, marginBottom: 8 },
    titleSub: { fontSize: 10, fontWeight: "bold", color: "#333", marginBottom: 6 },
    titleDateRow: { flexDirection: "row", marginBottom: 3, justifyContent: "flex-end" },
    titleDateLabel: { fontSize: 9, color: "#aaa", marginRight: 4 },
    titleDateValue: { fontSize: 9, fontWeight: "bold", color: "#333" },

    // ── SECTION ──
    sectionTitle: { fontSize: 10, fontWeight: "bold", color: accent, marginBottom: 8, marginTop: 18 },

    // ── DETAILS GRID ──
    detailBox: { borderWidth: 1, borderColor: "#ddd", borderRadius: 4, padding: 12 },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    field: { width: "50%", marginBottom: 8, paddingRight: 10 },
    fieldLabel: { fontSize: 8, color: "#aaa" },
    fieldValue: { fontSize: 10, fontWeight: "bold" },

    // ── TABLE ──
    table: { marginTop: 6 },
    thead: { flexDirection: "row", backgroundColor: accent, paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    th: { fontSize: 8, fontWeight: "bold", color: "#fff" },
    trow: { flexDirection: "row", paddingTop: 8, paddingBottom: 8, paddingLeft: 8, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
    td: { fontSize: 9 },

    // ── NOTES ──
    notesBox: { marginTop: 14, padding: 10, backgroundColor: "#f9f9f9", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: accent },
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
            </View>
          </View>
          <View style={styles.titleCol}>
            <Text style={styles.titleBig}>АКТ</Text>
            <Text style={styles.titleSub}>за извършено бетониране</Text>
            <View style={styles.titleDateRow}>
              <Text style={styles.titleDateLabel}>№:</Text>
              <Text style={styles.titleDateValue}>{pouring.id}</Text>
            </View>
            <View style={styles.titleDateRow}>
              <Text style={styles.titleDateLabel}>Дата:</Text>
              <Text style={styles.titleDateValue}>{pouring.date || "-"}</Text>
            </View>
          </View>
        </View>

        {/* ═══ DETAILS ═══ */}
        <Text style={styles.sectionTitle}>Данни за обекта и изпълнението</Text>
        <View style={styles.detailBox}>
          <View style={styles.grid}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Обект</Text>
              <Text style={styles.fieldValue}>{pouring.siteName || "-"}</Text>
              {pouring.siteCity ? <Text style={{ fontSize: 8, color: "#888" }}>{pouring.siteCity}</Text> : null}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Клиент</Text>
              <Text style={styles.fieldValue}>{pouring.clientName || "-"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Дата на изпълнение</Text>
              <Text style={styles.fieldValue}>{pouring.date || "-"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Машина (помпа)</Text>
              <Text style={styles.fieldValue}>{pouring.machineName || "-"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Метеорологични условия</Text>
              <Text style={styles.fieldValue}>{pouring.weather || "-"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Статус</Text>
              <Text style={styles.fieldValue}>
                {pouring.status === "completed" ? "Изпълнено" : pouring.status === "pending" ? "Предстои" : pouring.status || "-"}
              </Text>
            </View>
          </View>
        </View>

        {/* ═══ ITEMS TABLE ═══ */}
        {pouring.items && pouring.items.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Изпълнени работи</Text>
            <View style={styles.table}>
              <View style={styles.thead}>
                <Text style={[styles.th, { flex: 1 }]}>Тип бетон</Text>
                <Text style={[styles.th, { width: 70, textAlign: "center" }]}>К-во (m³)</Text>
                <Text style={[styles.th, { width: 80, textAlign: "right" }]}>Цена/m³</Text>
                <Text style={[styles.th, { width: 90, textAlign: "right" }]}>Общо</Text>
              </View>
              {pouring.items.map((item: any, i: number) => (
                <View style={styles.trow} key={i}>
                  <Text style={[styles.td, { flex: 1 }]}>{item.concreteTypeName || "-"}</Text>
                  <Text style={[styles.td, { width: 70, textAlign: "center" }]}>{item.quantityM3 || 0}</Text>
                  <Text style={[styles.td, { width: 80, textAlign: "right" }]}>{(item.pricePerM3 || 0).toFixed(2)} лв</Text>
                  <Text style={[styles.td, { width: 90, textAlign: "right", fontWeight: "bold" }]}>{(item.total || 0).toFixed(2)} лв</Text>
                </View>
              ))}
              <View style={[styles.trow, { backgroundColor: "#f5f5f5", fontWeight: "bold" }]}>
                <Text style={[styles.td, { flex: 1, fontWeight: "bold" }]}>ОБЩО</Text>
                <Text style={[styles.td, { width: 70, textAlign: "center", fontWeight: "bold" }]}>{(pouring.totalQty || 0).toFixed(1)}</Text>
                <Text style={[styles.td, { width: 80, textAlign: "right" }]}></Text>
                <Text style={[styles.td, { width: 90, textAlign: "right", fontWeight: "bold" }]}>{(pouring.totalPrice || 0).toFixed(2)} лв</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Количество</Text>
              <Text style={styles.fieldValue}>{pouring.totalQty || 0} m³</Text>
            </View>
          </>
        )}

        {/* ═══ WORKERS ═══ */}
        {pouring.workers && pouring.workers.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Работници на смяна</Text>
            <View style={styles.table}>
              <View style={styles.thead}>
                <Text style={[styles.th, { flex: 1 }]}>Име</Text>
                <Text style={[styles.th, { width: 60, textAlign: "center" }]}>Часа</Text>
              </View>
              {pouring.workers.map((w: any, i: number) => (
                <View style={styles.trow} key={i}>
                  <Text style={[styles.td, { flex: 1 }]}>{w.workerName || "-"}</Text>
                  <Text style={[styles.td, { width: 60, textAlign: "center" }]}>{w.hours}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* ═══ NOTES ═══ */}
        {pouring.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{pouring.notes}</Text>
          </View>
        ) : null}

        {/* ═══ FOOTER ═══ */}
        <View style={styles.footer}>
          <View style={styles.footLine} />
          <Text style={styles.footText}>
            {[c.companyName, c.eik ? `ЕИК ${c.eik}` : "", c.city].filter(Boolean).join("  •  ")}
            {"  —  "}Акт № {pouring.id}
          </Text>
          <View style={styles.signRow}>
            <View style={styles.signCol}>
              <View style={styles.signLine} />
              <Text style={styles.signLab}>Изпълнител: ________________________</Text>
            </View>
            <View style={styles.signCol}>
              <View style={styles.signLine} />
              <Text style={styles.signLab}>Възложител: ________________________</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}
