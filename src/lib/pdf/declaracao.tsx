import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, ESCOLA } from "./styles";

export function DeclaracaoDoc({
  aluno,
  cpf,
  matricula,
  curso,
  turma,
  dataHoje,
}: {
  aluno: string;
  cpf: string;
  matricula: string;
  curso: string;
  turma: string;
  dataHoje: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.escola}>{ESCOLA}</Text>
          <Text style={styles.titulo}>Declaração de Matrícula</Text>
        </View>

        <Text style={styles.paragrafo}>
          Declaramos que {aluno}, CPF {cpf}, matrícula {matricula}, está regularmente
          matriculado(a) no curso {curso}, turma {turma}.
        </Text>

        <Text style={styles.data}>{dataHoje}</Text>

        <Text style={styles.footer}>{ESCOLA} — documento gerado eletronicamente</Text>
      </Page>
    </Document>
  );
}
