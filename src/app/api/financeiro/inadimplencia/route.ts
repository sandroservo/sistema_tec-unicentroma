import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

// Uma parcela está EM ATRASO se status IN (pendente,vencido) E vencimento < hoje.
export async function GET() {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);

    const parcelas = await prisma.parcela.findMany({
      where: { status: { in: ["pendente", "vencido"] }, vencimento: { lt: hoje } },
      select: {
        valor: true,
        vencimento: true,
        contrato: { select: { alunoId: true, aluno: { select: { nome: true } } } },
      },
    });

    const porAluno = new Map<
      number,
      { alunoId: number; alunoNome: string; qtdParcelas: number; valorEmAtraso: number; venceMaisAntigo: Date }
    >();

    for (const p of parcelas) {
      const alunoId = p.contrato.alunoId;
      const cur = porAluno.get(alunoId);
      if (cur) {
        cur.qtdParcelas += 1;
        cur.valorEmAtraso += Number(p.valor);
        if (p.vencimento < cur.venceMaisAntigo) cur.venceMaisAntigo = p.vencimento;
      } else {
        porAluno.set(alunoId, {
          alunoId,
          alunoNome: p.contrato.aluno.nome,
          qtdParcelas: 1,
          valorEmAtraso: Number(p.valor),
          venceMaisAntigo: p.vencimento,
        });
      }
    }

    const dia = 1000 * 60 * 60 * 24;
    const alunos = [...porAluno.values()]
      .map((a) => ({
        alunoId: a.alunoId,
        alunoNome: a.alunoNome,
        qtdParcelas: a.qtdParcelas,
        valorEmAtraso: Math.round(a.valorEmAtraso * 100) / 100,
        diasAtrasoMax: Math.floor((hoje.getTime() - a.venceMaisAntigo.getTime()) / dia),
      }))
      .sort((x, y) => y.valorEmAtraso - x.valorEmAtraso);

    const totalEmAtraso = Math.round(alunos.reduce((s, a) => s + a.valorEmAtraso, 0) * 100) / 100;

    return NextResponse.json({ alunos, totalEmAtraso, totalAlunos: alunos.length });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar relatório de inadimplência" }, { status: 500 });
  }
}
