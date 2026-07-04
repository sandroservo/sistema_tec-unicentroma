import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, ESCOLA } from "./styles";

export type BoletimLinha = { disciplina: string; media: number | null; situacao: string };

export function BoletimDoc({
  aluno,
  turma,
  curso,
  linhas,
}: {
  aluno: string;
  turma: string;
  curso: string;
  linhas: BoletimLinha[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.escola}>{ESCOLA}</Text>
          <Text style={styles.titulo}>Boletim Escolar</Text>
          <View style={styles.meta}>
            <Text><Text style={styles.metaLabel}>Aluno: </Text>{aluno}</Text>
            <Text><Text style={styles.metaLabel}>Curso: </Text>{curso}</Text>
            <Text><Text style={styles.metaLabel}>Turma: </Text>{turma}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.th, { flex: 3 }]}>Disciplina</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>Média</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: "center", borderRightWidth: 0 }]}>Situação</Text>
          </View>
          {linhas.length === 0 && (
            <View style={styles.rowLast}>
              <Text style={[styles.td, { flex: 5.5, borderRightWidth: 0, textAlign: "center" }]}>
                Nenhuma disciplina encontrada.
              </Text>
            </View>
          )}
          {linhas.map((l, i) => (
            <View key={i} style={i === linhas.length - 1 ? styles.rowLast : styles.row}>
              <Text style={[styles.td, { flex: 3 }]}>{l.disciplina}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "center" }]}>
                {l.media != null ? l.media.toFixed(1) : "—"}
              </Text>
              <Text style={[styles.td, { flex: 1.5, textAlign: "center", borderRightWidth: 0 }]}>
                {l.situacao}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>{ESCOLA} — documento gerado eletronicamente</Text>
      </Page>
    </Document>
  );
}
