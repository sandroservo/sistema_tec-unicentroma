import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, ESCOLA } from "./styles";

export type HistoricoItem = {
  curso: string;
  disciplina: string;
  cargaHoraria: number | null;
  media: number | null;
  situacao: string;
};

export function HistoricoDoc({ aluno, itens }: { aluno: string; itens: HistoricoItem[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.escola}>{ESCOLA}</Text>
          <Text style={styles.titulo}>Histórico Escolar</Text>
          <View style={styles.meta}>
            <Text><Text style={styles.metaLabel}>Aluno: </Text>{aluno}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.th, { flex: 2.5 }]}>Curso</Text>
            <Text style={[styles.th, { flex: 2.5 }]}>Disciplina</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>C.H.</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>Média</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: "center", borderRightWidth: 0 }]}>Situação</Text>
          </View>
          {itens.length === 0 && (
            <View style={styles.rowLast}>
              <Text style={[styles.td, { flex: 8.5, borderRightWidth: 0, textAlign: "center" }]}>
                Nenhuma disciplina encontrada.
              </Text>
            </View>
          )}
          {itens.map((it, i) => (
            <View key={i} style={i === itens.length - 1 ? styles.rowLast : styles.row}>
              <Text style={[styles.td, { flex: 2.5 }]}>{it.curso}</Text>
              <Text style={[styles.td, { flex: 2.5 }]}>{it.disciplina}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "center" }]}>
                {it.cargaHoraria != null ? it.cargaHoraria : "—"}
              </Text>
              <Text style={[styles.td, { flex: 1, textAlign: "center" }]}>
                {it.media != null ? it.media.toFixed(1) : "—"}
              </Text>
              <Text style={[styles.td, { flex: 1.5, textAlign: "center", borderRightWidth: 0 }]}>
                {it.situacao}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>{ESCOLA} — documento gerado eletronicamente</Text>
      </Page>
    </Document>
  );
}
