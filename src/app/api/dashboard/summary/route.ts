import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";

export async function GET() {
  try {
    const guard = await requirePermission("dashboard:ler");
    if (guard instanceof NextResponse) return guard;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalAlunos,
      alunosAtivos,
      totalProfessores,
      totalCursos,
      turmasEmAndamento,
      matriculasNoMes,
      receitaRows,
      inadimpl,
      certificadosEmitidos,
    ] = await Promise.all([
      prisma.aluno.count(),
      prisma.aluno.count({ where: { status: "ativo" } }),
      prisma.professor.count(),
      prisma.curso.count(),
      prisma.turma.count({ where: { status: "em_andamento" } }),
      prisma.matricula.count({ where: { dataMatricula: { gte: startOfMonth } } }),
      prisma.cobranca.groupBy({ by: ["status"], _sum: { valor: true } }),
      prisma.cobranca.findMany({
        where: { status: "vencido" },
        distinct: ["alunoId"],
        select: { alunoId: true },
      }),
      prisma.certificado.count(),
    ]);

    const receitaMesAtual = receitaRows.find((r) => r.status === "pago");
    const receitaPendente = receitaRows.find((r) => r.status === "pendente");

    return NextResponse.json({
      totalAlunos,
      alunosAtivos,
      totalProfessores,
      totalCursos,
      turmasEmAndamento,
      matriculasNoMes,
      receitaMesAtual: num(receitaMesAtual?._sum.valor ?? null),
      receitaPendente: num(receitaPendente?._sum.valor ?? null),
      inadimplentes: inadimpl.length,
      certificadosEmitidos,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar sumário" }, { status: 500 });
  }
}
