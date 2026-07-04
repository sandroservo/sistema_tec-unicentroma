import type { Prisma } from "@prisma/client";

type AvalComLanc = {
  peso: Prisma.Decimal;
  lancamentos: { valor: Prisma.Decimal | null }[];
};

/** Média ponderada por (turma,disciplina): Σ(valor*peso)/Σ(peso) sobre lançamentos ≠ null. null se nenhum. */
export function calcularMedia(avaliacoes: AvalComLanc[]): number | null {
  let somaPeso = 0;
  let somaPonderada = 0;
  for (const a of avaliacoes) {
    const l = a.lancamentos[0];
    if (!l || l.valor == null) continue;
    const peso = Number(a.peso);
    somaPeso += peso;
    somaPonderada += Number(l.valor) * peso;
  }
  if (somaPeso === 0) return null;
  return somaPonderada / somaPeso;
}

export function situacao(media: number | null): string {
  if (media == null) return "Cursando";
  if (media >= 6) return "Aprovado";
  if (media >= 4) return "Recuperação";
  return "Reprovado";
}
