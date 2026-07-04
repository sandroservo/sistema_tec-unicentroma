import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cobrancaDTO } from "@/lib/dto";
import { requirePermission } from "@/lib/authz";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const cobrancas = await prisma.cobranca.findMany({
      where: { alunoId: parseInt(id) },
      orderBy: { vencimento: "asc" },
      include: { aluno: { select: { nome: true } } },
    });
    const data = cobrancas.map((c) =>
      cobrancaDTO({
        id: c.id,
        alunoId: c.alunoId,
        alunoNome: c.aluno?.nome ?? null,
        descricao: c.descricao,
        valor: c.valor,
        vencimento: c.vencimento,
        dataPagamento: c.dataPagamento,
        status: c.status,
        metodoPagamento: c.metodoPagamento,
        observacoes: c.observacoes,
        criadoEm: c.criadoEm,
      }),
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar financeiro do aluno" }, { status: 500 });
  }
}
