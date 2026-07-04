import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

// Conta presente/atraso/justificada como presença para o %; apenas "falta" reduz.
const PRESENTE = new Set(["presente", "atraso", "justificada"]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("frequencia:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const turmaId = parseInt(id);

    const [matriculas, aulas] = await Promise.all([
      prisma.matricula.findMany({
        where: { turmaId, status: "ativa" },
        include: { aluno: { select: { id: true, nome: true } } },
        orderBy: { aluno: { nome: "asc" } },
      }),
      prisma.aula.findMany({ where: { turmaId }, select: { id: true, presencas: true } }),
    ]);

    const totalAulas = aulas.length;
    const presByAluno = new Map<number, { pres: number; falta: number }>();
    for (const aula of aulas) {
      for (const p of aula.presencas) {
        const acc = presByAluno.get(p.alunoId) ?? { pres: 0, falta: 0 };
        if (PRESENTE.has(p.status)) acc.pres++;
        else acc.falta++;
        presByAluno.set(p.alunoId, acc);
      }
    }

    const data = matriculas.map((m) => {
      const acc = presByAluno.get(m.alunoId) ?? { pres: 0, falta: 0 };
      const percentual = totalAulas > 0 ? Math.round((acc.pres / totalAulas) * 1000) / 10 : 100;
      return {
        alunoId: m.alunoId,
        alunoNome: m.aluno.nome,
        totalAulas,
        presencas: acc.pres,
        faltas: acc.falta,
        percentual,
        risco: percentual < 75,
      };
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro ao calcular frequência" }, { status: 500 });
  }
}
