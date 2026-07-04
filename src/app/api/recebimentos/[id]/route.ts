import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { num } from "@/lib/serialize";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const r = await prisma.recebimento.findUnique({
      where: { id: parseInt(id) },
      include: { aluno: { select: { nome: true, cpf: true } }, itens: true },
    });
    if (!r) return NextResponse.json({ error: "Recebimento não encontrado" }, { status: 404 });

    const recebidoPor = r.recebidoPorUserId
      ? await prisma.user.findUnique({ where: { id: r.recebidoPorUserId }, select: { nome: true } })
      : null;

    return NextResponse.json({
      id: r.id,
      alunoId: r.alunoId,
      alunoNome: r.aluno.nome,
      alunoCpf: r.aluno.cpf,
      valor: num(r.valor),
      metodo: r.metodo,
      valorRecebido: r.valorRecebido ? num(r.valorRecebido) : null,
      observacoes: r.observacoes,
      recebidoPorNome: recebidoPor?.nome ?? null,
      criadoEm: r.criadoEm.toISOString(),
      itens: r.itens.map((i) => ({
        id: i.id,
        cobrancaId: i.cobrancaId,
        parcelaId: i.parcelaId,
        descricao: i.descricao,
        valor: num(i.valor),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar recebimento" }, { status: 500 });
  }
}
