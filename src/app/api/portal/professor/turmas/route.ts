import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/lib/serialize";
import { requireProfessor } from "@/lib/portal";
import { turmasWhere } from "../_scope";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireProfessor();
  if (guard instanceof NextResponse) return guard;
  const { professorId } = guard;

  const turmas = await prisma.turma.findMany({
    where: await turmasWhere(professorId),
    orderBy: { dataInicio: "desc" },
    include: {
      curso: { select: { nome: true } },
      _count: { select: { matriculas: { where: { status: "ativa" } } } },
    },
  });

  return NextResponse.json(
    turmas.map((t) => ({
      id: t.id,
      nome: t.nome,
      cursoNome: t.curso.nome,
      totalAlunos: t._count.matriculas,
      status: t.status,
      dataInicio: dateOnly(t.dataInicio),
    })),
  );
}
