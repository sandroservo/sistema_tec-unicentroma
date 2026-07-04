import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/authz";
import { currentProfessorId } from "@/lib/portal";
import { turmasWhere } from "@/app/api/portal/professor/_scope";

/**
 * Se o usuário logado é papel "professor", valida que a turma pertence ao escopo dele
 * (turma.professorId = ele OU turma.cursoId ∈ cursos das disciplinas dele).
 * Outros papéis (que passaram pelo guard de permissão) → sempre ok.
 * Retorna null quando ok, NextResponse 403 caso contrário.
 */
export async function assertProfessorTurma(turmaId: number): Promise<NextResponse | null> {
  const user = await currentUser();
  if (user?.papel !== "professor") return null;
  const professorId = await currentProfessorId();
  const turma = professorId
    ? await prisma.turma.findFirst({ where: { id: turmaId, ...(await turmasWhere(professorId)) } })
    : null;
  if (!turma) return NextResponse.json({ error: "Turma fora do escopo do professor" }, { status: 403 });
  return null;
}
