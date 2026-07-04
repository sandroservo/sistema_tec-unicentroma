import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";

export async function GET() {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;

  const matriculas = await prisma.matricula.findMany({
    where: { alunoId: guard.alunoId },
    select: { turma: { select: { cursoId: true } } },
  });
  const cursoIds = [...new Set(matriculas.map((m) => m.turma.cursoId))];
  if (cursoIds.length === 0) return NextResponse.json([]);

  const disciplinas = await prisma.disciplina.findMany({
    where: { cursoId: { in: cursoIds } },
    orderBy: [{ periodo: "asc" }, { nome: "asc" }],
    select: { nome: true, cargaHoraria: true, obrigatoria: true, periodo: true },
  });

  return NextResponse.json(
    disciplinas.map((d) => ({
      periodo: d.periodo,
      disciplinaNome: d.nome,
      cargaHoraria: d.cargaHoraria,
      obrigatoria: d.obrigatoria,
    })),
  );
}
