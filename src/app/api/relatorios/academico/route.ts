import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { dateOnly } from "@/lib/serialize";
import { periodo, LIMITE_LINHAS } from "../periodo";

// Situação pela média ponderada das avaliações da turma: ≥6 aprovado, ≥4 recuperação, <4 reprovado, sem notas cursando.
function situacao(media: number | null) {
  if (media == null) return "cursando";
  if (media >= 6) return "aprovado";
  if (media >= 4) return "recuperacao";
  return "reprovado";
}

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("relatorio:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const { de, ate } = periodo(sp);
    const cursoId = sp.get("cursoId");

    const matriculas = await prisma.matricula.findMany({
      where: {
        dataMatricula: { gte: de, lte: ate },
        ...(cursoId ? { turma: { cursoId: parseInt(cursoId) } } : {}),
      },
      include: {
        aluno: { select: { id: true, nome: true, status: true } },
        turma: { select: { id: true, nome: true, curso: { select: { nome: true } } } },
      },
      orderBy: { dataMatricula: "desc" },
      take: LIMITE_LINHAS,
    });

    // Média ponderada por (turma, aluno) num único fetch.
    const lancs = matriculas.length
      ? await prisma.lancamentoNota.findMany({
          where: {
            alunoId: { in: [...new Set(matriculas.map((m) => m.alunoId))] },
            valor: { not: null },
            avaliacao: { turmaId: { in: [...new Set(matriculas.map((m) => m.turmaId))] } },
          },
          select: { alunoId: true, valor: true, avaliacao: { select: { turmaId: true, peso: true } } },
        })
      : [];
    const acc = new Map<string, { soma: number; pesos: number }>();
    for (const l of lancs) {
      const key = `${l.avaliacao.turmaId}:${l.alunoId}`;
      const a = acc.get(key) ?? { soma: 0, pesos: 0 };
      const peso = Number(l.avaliacao.peso);
      a.soma += Number(l.valor) * peso;
      a.pesos += peso;
      acc.set(key, a);
    }

    const linhas = matriculas.map((m) => {
      const a = acc.get(`${m.turmaId}:${m.alunoId}`);
      const media = a && a.pesos > 0 ? Math.round((a.soma / a.pesos) * 100) / 100 : null;
      return {
        aluno: m.aluno.nome,
        curso: m.turma.curso.nome,
        turma: m.turma.nome,
        status: m.status,
        dataMatricula: dateOnly(m.dataMatricula),
        media,
        situacao: situacao(media),
      };
    });

    const porCursoMap = new Map<string, number>();
    for (const l of linhas) porCursoMap.set(l.curso, (porCursoMap.get(l.curso) ?? 0) + 1);

    const totais = {
      matriculasPeriodo: linhas.length,
      alunosAtivos: new Set(matriculas.filter((m) => m.aluno.status === "ativo").map((m) => m.alunoId)).size,
      aprovados: linhas.filter((l) => l.situacao === "aprovado").length,
      reprovados: linhas.filter((l) => l.situacao === "reprovado").length,
      emCurso: linhas.filter((l) => l.situacao === "cursando").length,
      evasao: linhas.filter((l) => l.status === "trancado" || l.status === "inativo").length,
    };

    return NextResponse.json({
      totais,
      porCurso: [...porCursoMap].map(([curso, matriculas]) => ({ curso, matriculas })),
      linhas,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar relatório acadêmico" }, { status: 500 });
  }
}
