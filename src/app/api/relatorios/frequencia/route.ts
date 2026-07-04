import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { periodo, LIMITE_LINHAS } from "../periodo";

// Mesma regra de /api/turmas/[id]/frequencia: presente/atraso/justificada contam presença; risco < 75%.
const PRESENTE = new Set(["presente", "atraso", "justificada"]);

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("relatorio:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const { de, ate } = periodo(sp);
    const turmaId = sp.get("turmaId");

    const aulas = await prisma.aula.findMany({
      where: { data: { gte: de, lte: ate }, ...(turmaId ? { turmaId: parseInt(turmaId) } : {}) },
      select: { turmaId: true, presencas: { select: { alunoId: true, status: true } } },
    });

    const turmaIds = [...new Set(aulas.map((a) => a.turmaId))];
    const [turmas, matriculas] = await Promise.all([
      prisma.turma.findMany({
        where: { id: { in: turmaIds } },
        select: { id: true, nome: true, curso: { select: { nome: true } } },
        orderBy: { nome: "asc" },
      }),
      prisma.matricula.findMany({
        where: { turmaId: { in: turmaIds }, status: "ativa" },
        include: { aluno: { select: { nome: true } } },
        orderBy: { aluno: { nome: "asc" } },
      }),
    ]);

    const aulasPorTurma = new Map<number, number>();
    const presPorAluno = new Map<string, { pres: number; falta: number }>(); // "turmaId:alunoId"
    for (const aula of aulas) {
      aulasPorTurma.set(aula.turmaId, (aulasPorTurma.get(aula.turmaId) ?? 0) + 1);
      for (const p of aula.presencas) {
        const key = `${aula.turmaId}:${p.alunoId}`;
        const acc = presPorAluno.get(key) ?? { pres: 0, falta: 0 };
        if (PRESENTE.has(p.status)) acc.pres++;
        else acc.falta++;
        presPorAluno.set(key, acc);
      }
    }

    const turmaById = new Map(turmas.map((t) => [t.id, t]));
    const linhas = matriculas.slice(0, LIMITE_LINHAS).map((m) => {
      const t = turmaById.get(m.turmaId);
      const totalAulas = aulasPorTurma.get(m.turmaId) ?? 0;
      const acc = presPorAluno.get(`${m.turmaId}:${m.alunoId}`) ?? { pres: 0, falta: 0 };
      const pct = totalAulas > 0 ? Math.round((acc.pres / totalAulas) * 1000) / 10 : 100;
      return {
        aluno: m.aluno.nome,
        turma: t?.nome ?? "",
        totalAulas,
        presencas: acc.pres,
        faltas: acc.falta,
        pct,
        risco: pct < 75,
      };
    });

    const porTurma = turmas.map((t) => {
      const doTurma = linhas.filter((l) => l.turma === t.nome);
      const pct = doTurma.length ? Math.round((doTurma.reduce((s, l) => s + l.pct, 0) / doTurma.length) * 10) / 10 : 0;
      return { turma: t.nome, curso: t.curso.nome, pct };
    });

    const totais = {
      turmas: turmas.length,
      alunosRisco: linhas.filter((l) => l.risco).length,
      mediaGeralPct: linhas.length ? Math.round((linhas.reduce((s, l) => s + l.pct, 0) / linhas.length) * 10) / 10 : 0,
    };

    return NextResponse.json({ totais, porTurma, linhas });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar relatório de frequência" }, { status: 500 });
  }
}
