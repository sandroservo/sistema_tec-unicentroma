import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { num } from "@/lib/serialize";
import { totaisPorMetodo } from "../totais";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const s = await prisma.caixaSessao.findUnique({
      where: { id: parseInt(id) },
      include: {
        recebimentos: {
          orderBy: { criadoEm: "desc" },
          include: { aluno: { select: { nome: true } } },
        },
      },
    });
    if (!s) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });

    const userIds = [s.abertoPorUserId, s.fechadoPorUserId].filter((u): u is string => !!u);
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nome: true } });
    const nome = (uid: string | null) => users.find((u) => u.id === uid)?.nome ?? null;

    const totais = totaisPorMetodo(s.recebimentos);
    const esperadoDinheiro = Math.round((num(s.valorAbertura) + totais.dinheiro) * 100) / 100;
    const valorFechamento = s.valorFechamento !== null ? num(s.valorFechamento) : null;

    return NextResponse.json({
      id: s.id,
      status: s.status,
      abertoEm: s.abertoEm.toISOString(),
      fechadoEm: s.fechadoEm?.toISOString() ?? null,
      abertoPorNome: nome(s.abertoPorUserId),
      fechadoPorNome: nome(s.fechadoPorUserId),
      valorAbertura: num(s.valorAbertura),
      valorFechamento,
      observacoes: s.observacoes,
      totais,
      esperadoDinheiro,
      diferenca: valorFechamento !== null ? Math.round((valorFechamento - esperadoDinheiro) * 100) / 100 : null,
      recebimentos: s.recebimentos.map((r) => ({
        id: r.id,
        alunoNome: r.aluno.nome,
        valor: num(r.valor),
        metodo: r.metodo,
        criadoEm: r.criadoEm.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao consultar sessão" }, { status: 500 });
  }
}
