import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";

export async function GET() {
  try {
    const guard = await requireAluno();
    if (guard instanceof NextResponse) return guard;
    const { alunoId } = guard;

    // cursos das matrículas ativas do aluno
    const matriculas = await prisma.matricula.findMany({
      where: { alunoId, status: "ativa" },
      select: { turma: { select: { cursoId: true } } },
    });
    const cursoIds = [...new Set(matriculas.map((m) => m.turma.cursoId))];
    if (cursoIds.length === 0) return NextResponse.json([]);

    // apenas cursos que têm EAD (ModuloEad)
    const cursos = await prisma.curso.findMany({
      where: { id: { in: cursoIds }, modulosEad: { some: {} } },
      select: {
        id: true,
        nome: true,
        modulosEad: { select: { aulas: { select: { id: true } } } },
      },
    });

    const result = await Promise.all(
      cursos.map(async (c) => {
        const aulaIds = c.modulosEad.flatMap((m) => m.aulas.map((a) => a.id));
        const totalAulas = aulaIds.length;
        const aulasConcluidas = totalAulas
          ? await prisma.progressoAula.count({
              where: { alunoId, concluido: true, aulaId: { in: aulaIds } },
            })
          : 0;
        return {
          cursoId: c.id,
          cursoNome: c.nome,
          totalAulas,
          aulasConcluidas,
          percentual: totalAulas ? Math.round((aulasConcluidas / totalAulas) * 100) : 0,
        };
      }),
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar cursos EAD" }, { status: 500 });
  }
}
