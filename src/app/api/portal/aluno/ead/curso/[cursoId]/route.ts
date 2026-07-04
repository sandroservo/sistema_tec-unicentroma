import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";

export async function GET(_req: Request, { params }: { params: Promise<{ cursoId: string }> }) {
  try {
    const guard = await requireAluno();
    if (guard instanceof NextResponse) return guard;
    const { alunoId } = guard;
    const cursoId = parseInt((await params).cursoId);

    // segurança: curso precisa estar entre as matrículas ativas do aluno
    const matricula = await prisma.matricula.findFirst({
      where: { alunoId, status: "ativa", turma: { cursoId } },
      select: { id: true },
    });
    if (!matricula) return NextResponse.json({ error: "Curso não disponível" }, { status: 403 });

    const modulos = await prisma.moduloEad.findMany({
      where: { cursoId },
      orderBy: { ordem: "asc" },
      include: { aulas: { orderBy: { ordem: "asc" } } },
    });

    const aulaIds = modulos.flatMap((m) => m.aulas.map((a) => a.id));
    const progresso = aulaIds.length
      ? await prisma.progressoAula.findMany({
          where: { alunoId, aulaId: { in: aulaIds } },
          select: { aulaId: true, concluido: true },
        })
      : [];
    const concluidas = new Set(progresso.filter((p) => p.concluido).map((p) => p.aulaId));

    return NextResponse.json(
      modulos.map((m) => ({
        id: m.id,
        titulo: m.titulo,
        descricao: m.descricao,
        ordem: m.ordem,
        aulas: m.aulas.map((a) => ({
          id: a.id,
          titulo: a.titulo,
          tipo: a.tipo,
          url: a.url,
          conteudo: a.conteudo,
          ordem: a.ordem,
          duracaoMin: a.duracaoMin,
          concluido: concluidas.has(a.id),
        })),
      })),
    );
  } catch {
    return NextResponse.json({ error: "Erro ao buscar conteúdo do curso" }, { status: 500 });
  }
}
