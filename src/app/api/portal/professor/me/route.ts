import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProfessor } from "@/lib/portal";
import { turmasWhere } from "../_scope";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireProfessor();
  if (guard instanceof NextResponse) return guard;
  const { professorId } = guard;

  const [professor, totalTurmas] = await Promise.all([
    prisma.professor.findUnique({ where: { id: professorId }, select: { nome: true } }),
    prisma.turma.count({ where: await turmasWhere(professorId) }),
  ]);

  return NextResponse.json({ professorId, nome: professor?.nome ?? "", totalTurmas });
}
