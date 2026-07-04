import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { LIMITE_LINHAS } from "../periodo";

export async function GET() {
  try {
    const guard = await requirePermission("relatorio:ler");
    if (guard instanceof NextResponse) return guard;

    const turmas = await prisma.turma.findMany({
      where: { status: { notIn: ["concluida", "cancelada"] } },
      include: {
        curso: { select: { nome: true } },
        sala: { select: { nome: true } },
        professor: { select: { nome: true } },
      },
      orderBy: { nome: "asc" },
      take: LIMITE_LINHAS,
    });

    const linhas = turmas.map((t) => ({
      turma: t.nome,
      curso: t.curso.nome,
      sala: t.sala?.nome ?? "—",
      professor: t.professor?.nome ?? "—",
      vagas: t.vagas,
      ocupadas: t.vagasOcupadas,
      pct: t.vagas > 0 ? Math.round((t.vagasOcupadas / t.vagas) * 1000) / 10 : 0,
      status: t.status,
    }));

    const porCursoMap = new Map<string, { vagas: number; ocupadas: number }>();
    for (const l of linhas) {
      const acc = porCursoMap.get(l.curso) ?? { vagas: 0, ocupadas: 0 };
      acc.vagas += l.vagas;
      acc.ocupadas += l.ocupadas;
      porCursoMap.set(l.curso, acc);
    }

    const vagasTotais = linhas.reduce((s, l) => s + l.vagas, 0);
    const ocupadas = linhas.reduce((s, l) => s + l.ocupadas, 0);

    return NextResponse.json({
      totais: {
        turmasAtivas: turmas.filter((t) => t.status === "em_andamento").length,
        vagasTotais,
        ocupadas,
        pctOcupacao: vagasTotais > 0 ? Math.round((ocupadas / vagasTotais) * 1000) / 10 : 0,
      },
      porCurso: [...porCursoMap].map(([curso, v]) => ({ curso, ...v })),
      linhas,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar relatório de ocupação" }, { status: 500 });
  }
}
