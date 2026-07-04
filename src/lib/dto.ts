// Serializadores que reproduzem o formato JSON do backend Express+Drizzle original,
// para o client gerado (orval) continuar funcionando sem alteração.
import { dateOnly, num, decStr } from "./serialize";

type AnyRow = Record<string, unknown> & { [k: string]: any };

export const alunoDTO = (a: AnyRow) => ({
  ...a,
  dataNascimento: dateOnly(a.dataNascimento),
});

export const cursoDTO = (c: AnyRow) => ({ ...c, valor: num(c.valor) });

export const turmaDTO = (t: AnyRow) => ({
  ...t,
  dataInicio: dateOnly(t.dataInicio),
  dataFim: dateOnly(t.dataFim),
});

export const notaDTO = (n: AnyRow) => ({
  ...n,
  nota1: decStr(n.nota1),
  nota2: decStr(n.nota2),
  nota3: decStr(n.nota3),
  notaFinal: decStr(n.notaFinal),
  media: decStr(n.media),
});

export const cobrancaDTO = (c: AnyRow) => ({
  ...c,
  valor: num(c.valor),
  vencimento: dateOnly(c.vencimento),
  dataPagamento: dateOnly(c.dataPagamento),
});

export const certificadoDTO = (c: AnyRow) => ({
  ...c,
  dataEmissao: dateOnly(c.dataEmissao),
});
