import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";
import { turmaIdsDoAluno } from "../_media";

// presente | atraso | justificada contam presença; falta reduz.
function ehPresenca(status: string) {
  return status !== "falta";
}

export async function GET() {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;
  const { alunoId } = guard;

  const turmaIds = await turmaIdsDoAluno(alunoId);
  if (turmaIds.length === 0) return NextResponse.json([]);

  const presencas = await prisma.presenca.findMany({
    where: { alunoId, aula: { turmaId: { in: turmaIds } } },
    include: {
      aula: {
        select: {
          turma: { select: { nome: true } },
          disciplina: { select: { nome: true } },
        },
      },
    },
  });

  const acc = new Map<string, { turmaNome: string; disciplinaNome: string; total: number; presentes: number }>();
  for (const p of presencas) {
    const turmaNome = p.aula.turma.nome;
    const disciplinaNome = p.aula.disciplina.nome;
    const key = `${turmaNome}|${disciplinaNome}`;
    const cur = acc.get(key) ?? { turmaNome, disciplinaNome, total: 0, presentes: 0 };
    cur.total += 1;
    if (ehPresenca(p.status)) cur.presentes += 1;
    acc.set(key, cur);
  }

  const rows = [...acc.values()].map((r) => {
    const percentual = r.total > 0 ? (r.presentes / r.total) * 100 : 0;
    return { turmaNome: r.turmaNome, disciplinaNome: r.disciplinaNome, percentual, risco: percentual < 75 };
  });

  return NextResponse.json(rows);
}
