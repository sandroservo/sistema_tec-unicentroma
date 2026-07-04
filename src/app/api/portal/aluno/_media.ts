import { prisma } from "@/lib/prisma";

export function situacaoDe(media: number | null): string {
  if (media == null) return "Cursando";
  if (media >= 6) return "Aprovado";
  if (media >= 4) return "Recuperação";
  return "Reprovado";
}

/** Turmas em que o aluno tem matrícula ativa. */
export async function turmaIdsDoAluno(alunoId: number): Promise<number[]> {
  const ms = await prisma.matricula.findMany({
    where: { alunoId, status: "ativa" },
    select: { turmaId: true },
  });
  return ms.map((m) => m.turmaId);
}

export type MediaDisciplina = { disciplinaNome: string; media: number | null; situacao: string };

/** Média ponderada por disciplina: Σ(valor·peso)/Σ(peso) sobre lançamentos do aluno com valor≠null. */
export async function mediasPorDisciplina(alunoId: number): Promise<MediaDisciplina[]> {
  const turmaIds = await turmaIdsDoAluno(alunoId);
  if (turmaIds.length === 0) return [];

  const avaliacoes = await prisma.avaliacao.findMany({
    where: { turmaId: { in: turmaIds } },
    include: {
      disciplina: { select: { nome: true } },
      lancamentos: { where: { alunoId }, select: { valor: true } },
    },
  });

  const acc = new Map<string, { som: number; peso: number }>();
  for (const av of avaliacoes) {
    const nome = av.disciplina.nome;
    const peso = Number(av.peso);
    const cur = acc.get(nome) ?? { som: 0, peso: 0 };
    for (const l of av.lancamentos) {
      if (l.valor != null) {
        cur.som += Number(l.valor) * peso;
        cur.peso += peso;
      }
    }
    acc.set(nome, cur);
  }

  return [...acc].map(([disciplinaNome, { som, peso }]) => {
    const media = peso > 0 ? som / peso : null;
    return { disciplinaNome, media, situacao: situacaoDe(media) };
  });
}
