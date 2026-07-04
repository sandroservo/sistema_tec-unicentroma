import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles } from "./styles";

export const METODO_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_debito: "Cartão de débito",
  cartao_credito: "Cartão de crédito",
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ReciboDoc({
  numero,
  alunoNome,
  alunoCpf,
  itens,
  total,
  metodo,
  valorRecebido,
  troco,
  dataHora,
  recebidoPor,
}: {
  numero: string;
  alunoNome: string;
  alunoCpf: string;
  itens: { descricao: string; valor: number }[];
  total: number;
  metodo: string;
  valorRecebido: number | null;
  troco: number | null;
  dataHora: string;
  recebidoPor: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.escola}>ERP Escola — TEC Unicentro</Text>
          <Text style={styles.titulo}>RECIBO Nº {numero}</Text>
        </View>

        <Text style={styles.meta}>
          <Text style={styles.metaLabel}>Aluno: </Text>
          {alunoNome}
          {"\n"}
          <Text style={styles.metaLabel}>CPF: </Text>
          {alunoCpf}
        </Text>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.th, { flex: 3 }]}>Descrição</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Valor</Text>
          </View>
          {itens.map((i, idx) => (
            <View key={idx} style={idx === itens.length - 1 ? styles.rowLast : styles.row}>
              <Text style={[styles.td, { flex: 3 }]}>{i.descricao}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{brl(i.valor)}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.paragrafo, { fontFamily: "Helvetica-Bold", fontSize: 13, textAlign: "right" }]}>
          TOTAL: {brl(total)}
        </Text>

        <Text style={styles.meta}>
          <Text style={styles.metaLabel}>Método de pagamento: </Text>
          {METODO_LABEL[metodo] ?? metodo}
          {metodo === "dinheiro" && valorRecebido !== null ? (
            <>
              {"\n"}
              <Text style={styles.metaLabel}>Valor recebido: </Text>
              {brl(valorRecebido)}
              {"\n"}
              <Text style={styles.metaLabel}>Troco: </Text>
              {brl(troco ?? 0)}
            </>
          ) : null}
        </Text>

        <Text style={styles.data}>
          {dataHora}
          {"\n"}Recebido por: {recebidoPor}
        </Text>

        <Text style={styles.footer}>Documento sem valor fiscal</Text>
      </Page>
    </Document>
  );
}
