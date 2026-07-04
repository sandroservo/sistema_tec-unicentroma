import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProfessor } from "@/lib/portal";
import { turmasWhere } from "../../_scope";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireProfessor();
  if (guard instanceof NextResponse) return guard;
  const { professorId } = guard;
  const { id } = await params;
  const turmaId = parseInt(id);

  // Valida posse: a turma precisa estar no escopo do professor.
  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, ...(await turmasWhere(professorId)) },
    include: { curso: { select: { id: true, nome: true } } },
  });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 403 });

  const [matriculas, disciplinas] = await Promise.all([
    prisma.matricula.findMany({
      where: { turmaId, status: "ativa" },
      include: { aluno: { select: { id: true, nome: true } } },
      orderBy: { aluno: { nome: "asc" } },
    }),
    // disciplinas do curso da turma que pertencem ao professor; se nenhuma, todas do curso.
    prisma.disciplina.findMany({
      where: { cursoId: turma.curso.id, professorId },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const disciplinasFinal = disciplinas.length
    ? disciplinas
    : await prisma.disciplina.findMany({
        where: { cursoId: turma.curso.id },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
      });

  return NextResponse.json({
    turma: { id: turma.id, nome: turma.nome, cursoNome: turma.curso.nome },
    alunos: matriculas.map((m) => ({ id: m.aluno.id, nome: m.aluno.nome })),
    disciplinas: disciplinasFinal,
  });
}
