import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";

export async function GET() {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;
  const { alunoId } = guard;

  const aluno = await prisma.aluno.findUnique({ where: { id: alunoId }, select: { nome: true } });
  const matriculasAtivas = await prisma.matricula.count({ where: { alunoId, status: "ativa" } });

  return NextResponse.json({ alunoId, nome: aluno?.nome ?? "", matriculasAtivas });
}
