import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireResponsavel } from "@/lib/portal";
import { dateOnly, num } from "@/lib/serialize";
import { mediasPorDisciplina, turmaIdsDoAluno } from "../../../aluno/_media";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireResponsavel();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const alunoId = Number(id);

  // SEGURANÇA: só permite alunos vinculados a este responsável.
  if (!guard.alunoIds.includes(alunoId))
    return NextResponse.json({ error: "Sem permissão para este aluno" }, { status: 403 });

  const aluno = await prisma.aluno.findUnique({ where: { id: alunoId }, select: { nome: true } });
  if (!aluno) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const [notas, cobrancas, ocorrencias, requerimentos, turmaIds] = await Promise.all([
    mediasPorDisciplina(alunoId),
    prisma.cobranca.findMany({ where: { alunoId }, orderBy: { vencimento: "desc" } }),
    prisma.ocorrencia.findMany({ where: { alunoId }, orderBy: { data: "desc" } }),
    prisma.requerimento.findMany({
      where: { alunoId },
      orderBy: { criadoEm: "desc" },
      select: { protocolo: true, tipo: true, status: true, criadoEm: true },
    }),
    turmaIdsDoAluno(alunoId),
  ]);

  // Frequência % por turma/disciplina (presente|atraso|justificada = presença; falta reduz).
  let frequencia: { turmaNome: string; disciplinaNome: string; percentual: number; risco: boolean }[] = [];
  if (turmaIds.length > 0) {
    const presencas = await prisma.presenca.findMany({
      where: { alunoId, aula: { turmaId: { in: turmaIds } } },
      include: { aula: { select: { turma: { select: { nome: true } }, disciplina: { select: { nome: true } } } } },
    });
    const acc = new Map<string, { turmaNome: string; disciplinaNome: string; total: number; presentes: number }>();
    for (const p of presencas) {
      const turmaNome = p.aula.turma.nome;
      const disciplinaNome = p.aula.disciplina.nome;
      const key = `${turmaNome}|${disciplinaNome}`;
      const cur = acc.get(key) ?? { turmaNome, disciplinaNome, total: 0, presentes: 0 };
      cur.total += 1;
      if (p.status !== "falta") cur.presentes += 1;
      acc.set(key, cur);
    }
    frequencia = [...acc.values()].map((r) => {
      const percentual = r.total > 0 ? (r.presentes / r.total) * 100 : 0;
      return { turmaNome: r.turmaNome, disciplinaNome: r.disciplinaNome, percentual, risco: percentual < 75 };
    });
  }

  return NextResponse.json({
    aluno: { nome: aluno.nome },
    notas,
    frequencia,
    financeiro: cobrancas.map((c) => ({
      id: c.id,
      descricao: c.descricao,
      valor: num(c.valor),
      vencimento: dateOnly(c.vencimento),
      dataPagamento: dateOnly(c.dataPagamento),
      status: c.status,
    })),
    ocorrencias: ocorrencias.map((o) => ({
      tipo: o.tipo,
      gravidade: o.gravidade,
      descricao: o.descricao,
      data: dateOnly(o.data),
    })),
    requerimentos: requerimentos.map((r) => ({
      protocolo: r.protocolo,
      tipo: r.tipo,
      status: r.status,
      criadoEm: r.criadoEm.toISOString(),
    })),
  });
}
