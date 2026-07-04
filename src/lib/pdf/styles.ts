import { StyleSheet } from "@react-pdf/renderer";

export const ESCOLA = "ERP Escola Técnica";

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    color: "#111",
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#111",
    paddingBottom: 8,
  },
  escola: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  titulo: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 4 },
  meta: { fontSize: 10, marginTop: 6, lineHeight: 1.4 },
  metaLabel: { fontFamily: "Helvetica-Bold" },
  paragrafo: { fontSize: 11, lineHeight: 1.6, marginTop: 12, textAlign: "justify" },
  data: { fontSize: 11, marginTop: 30 },
  table: { marginTop: 12, borderWidth: 1, borderColor: "#111" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#111" },
  rowLast: { flexDirection: "row" },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    padding: 5,
    backgroundColor: "#eee",
    borderRightWidth: 1,
    borderRightColor: "#111",
  },
  td: {
    fontSize: 10,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: "#111",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#666",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 6,
  },
});
