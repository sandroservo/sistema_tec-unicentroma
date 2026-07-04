// Geração de parcelas de um contrato. Fonte única (usada por contratos e renegociação).

export type ParcelaGerada = { numero: number; valor: number; vencimento: Date };

/** Dia de vencimento no mês, com clamp para o último dia do mês (ex: dia 31 em fevereiro). */
function vencimentoNoMes(base: Date, mesesAFrente: number, dia: number): Date {
  const ano = base.getUTCFullYear();
  const mes = base.getUTCMonth() + mesesAFrente;
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDia)));
}

/** Arredonda para centavos. */
const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Gera as parcelas de um contrato aplicando desconto percentual sobre o total.
 * A última parcela absorve a diferença de arredondamento para fechar o total exato.
 */
export function gerarParcelas(params: {
  valorTotal: number;
  numParcelas: number;
  diaVencimento: number;
  dataInicio: Date;
  descontoPercentual?: number;
}): ParcelaGerada[] {
  const { valorTotal, numParcelas, diaVencimento, dataInicio } = params;
  const desc = params.descontoPercentual ?? 0;
  const n = Math.max(1, Math.floor(numParcelas));

  const totalLiquido = cents(valorTotal * (1 - desc / 100));
  const base = cents(totalLiquido / n);

  const parcelas: ParcelaGerada[] = [];
  let acumulado = 0;
  for (let i = 1; i <= n; i++) {
    const ultima = i === n;
    const valor = ultima ? cents(totalLiquido - acumulado) : base;
    acumulado = cents(acumulado + valor);
    parcelas.push({ numero: i, valor, vencimento: vencimentoNoMes(dataInicio, i - 1, diaVencimento) });
  }
  return parcelas;
}

/** Desconto efetivo (%) a partir de bolsa (percentual) e/ou convênio (percentualDesconto), somados e limitados a 100. */
export function descontoEfetivo(bolsaPct?: number | null, convenioPct?: number | null): number {
  return Math.min(100, (bolsaPct ?? 0) + (convenioPct ?? 0));
}
