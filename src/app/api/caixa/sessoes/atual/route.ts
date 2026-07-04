import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { num } from "@/lib/serialize";
import { totaisPorMetodo } from "../totais";

export async function GET() {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const s = await prisma.caixaSessao.findFirst({
      where: { status: "aberto" },
      include: { recebimentos: { select: { metodo: true, valor: true } } },
    });
    if (!s) return NextResponse.json(null);

    const abertoPor = s.abertoPorUserId
      ? await prisma.user.findUnique({ where: { id: s.abertoPorUserId }, select: { nome: true } })
      : null;

    const totais = totaisPorMetodo(s.recebimentos);
    return NextResponse.json({
      id: s.id,
      status: s.status,
      abertoEm: s.abertoEm.toISOString(),
      abertoPorNome: abertoPor?.nome ?? null,
      valorAbertura: num(s.valorAbertura),
      observacoes: s.observacoes,
      totais,
      esperadoDinheiro: Math.round((num(s.valorAbertura) + totais.dinheiro) * 100) / 100,
      numRecebimentos: s.recebimentos.length,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao consultar caixa atual" }, { status: 500 });
  }
}
