import { prisma } from "@/lib/prisma";

/**
 * Prisma `where` das turmas do professor:
 * turma.professorId = eu OU turma.cursoId entre os cursos das disciplinas do professor.
 * ponytail: escopo por professorId direto + cursos das disciplinas do professor;
 * cobre os dois vínculos sem query recursiva.
 */
export async function turmasWhere(professorId: number) {
  const disciplinas = await prisma.disciplina.findMany({
    where: { professorId },
    select: { cursoId: true },
  });
  const cursoIds = [...new Set(disciplinas.map((d) => d.cursoId))];
  return {
    OR: [{ professorId }, ...(cursoIds.length ? [{ cursoId: { in: cursoIds } }] : [])],
  };
}
