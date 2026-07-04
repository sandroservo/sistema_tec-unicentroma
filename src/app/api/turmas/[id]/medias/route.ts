import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

/** Média ponderada: Σ(valor*peso)/Σ(peso) das avaliações com lançamento valor≠null. null se nenhuma. */
function calcMedia(pares: { valor: number; peso: number }[]): number | null {
  if (pares.length === 0) return null;
  const somaPeso = pares.reduce((s, p) => s + p.peso, 0);
  if (somaPeso === 0) return null;
  const soma = pares.reduce((s, p) => s + p.valor * p.peso, 0);
  return Math.round((soma / somaPeso) * 100) / 100;
}

function situacao(media: number | null): string {
  if (media == null) return "em_curso";
  if (media >= 6) return "aprovado";
  if (media >= 4) return "recuperacao";
  return "reprovado";
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("nota:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const turmaId = parseInt(id);

    const sp = new URL(req.url).searchParams;
    const disciplinaId = sp.get("disciplinaId");

    const avaliacoes = await prisma.avaliacao.findMany({
      where: { turmaId, ...(disciplinaId ? { disciplinaId: parseInt(disciplinaId) } : {}) },
      include: {
        disciplina: { select: { id: true, nome: true } },
        lancamentos: { where: { valor: { not: null } }, select: { alunoId: true, valor: true } },
      },
    });

    const matriculas = await prisma.matricula.findMany({
      where: { turmaId, status: "ativa" },
      include: { aluno: { select: { id: true, nome: true } } },
      orderBy: { aluno: { nome: "asc" } },
    });

    // (alunoId, disciplinaId) -> pares valor/peso
    const acc = new Map<string, { disciplinaId: number; disciplinaNome: string; pares: { valor: number; peso: number }[] }>();
    for (const av of avaliacoes) {
      const peso = Number(av.peso);
      for (const l of av.lancamentos) {
        if (l.valor == null) continue;
        const key = `${l.alunoId}:${av.disciplinaId}`;
        let entry = acc.get(key);
        if (!entry) {
          entry = { disciplinaId: av.disciplinaId, disciplinaNome: av.disciplina?.nome ?? "", pares: [] };
          acc.set(key, entry);
        }
        entry.pares.push({ valor: Number(l.valor), peso });
      }
    }

    // disciplinas presentes na turma (para listar alunos sem lançamento também)
    const disciplinas = new Map<number, string>();
    for (const av of avaliacoes) disciplinas.set(av.disciplinaId, av.disciplina?.nome ?? "");

    const result: Array<{
      alunoId: number; alunoNome: string; disciplinaId: number; disciplinaNome: string;
      media: number | null; situacao: string;
    }> = [];

    for (const m of matriculas) {
      for (const [dId, dNome] of disciplinas) {
        const entry = acc.get(`${m.aluno.id}:${dId}`);
        const media = calcMedia(entry?.pares ?? []);
        result.push({
          alunoId: m.aluno.id,
          alunoNome: m.aluno.nome,
          disciplinaId: dId,
          disciplinaNome: dNome,
          media,
          situacao: situacao(media),
        });
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Erro ao calcular médias" }, { status: 500 });
  }
}
