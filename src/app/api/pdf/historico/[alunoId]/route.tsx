import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { canAccessAluno } from "@/lib/portal";
import { HistoricoDoc, type HistoricoItem } from "@/lib/pdf/historico";
import { calcularMedia, situacao } from "@/lib/pdf/media";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId: raw } = await params;
  const alunoId = parseInt(raw);
  // Admin (aluno:ler), o próprio aluno ou responsável vinculado.
  if (!(await canAccessAluno(alunoId))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  // Todas as matrículas → turma → curso → disciplinas do curso.
  const matriculas = await prisma.matricula.findMany({
    where: { alunoId },
    include: { turma: { include: { curso: { include: { disciplinas: true } } } } },
    orderBy: { dataMatricula: "asc" },
  });

  const itens: HistoricoItem[] = [];
  for (const m of matriculas) {
    for (const d of m.turma.curso.disciplinas) {
      const avaliacoes = await prisma.avaliacao.findMany({
        where: { turmaId: m.turmaId, disciplinaId: d.id },
        select: { peso: true, lancamentos: { where: { alunoId }, select: { valor: true } } },
      });
      const media = calcularMedia(avaliacoes);
      itens.push({
        curso: m.turma.curso.nome,
        disciplina: d.nome,
        cargaHoraria: d.cargaHoraria,
        media,
        situacao: situacao(media),
      });
    }
  }

  const buffer = await renderToBuffer(<HistoricoDoc aluno={aluno.nome} itens={itens} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="historico.pdf"`,
    },
  });
}
