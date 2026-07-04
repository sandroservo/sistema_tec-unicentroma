import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";

export async function GET() {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const rows = await prisma.cobranca.groupBy({ by: ["status"], _sum: { valor: true } });

    const resumo = { totalRecebido: 0, totalPendente: 0, totalVencido: 0, totalCancelado: 0, inadimplentes: 0 };
    for (const row of rows) {
      const v = num(row._sum.valor);
      if (row.status === "pago") resumo.totalRecebido = v;
      if (row.status === "pendente") resumo.totalPendente = v;
      if (row.status === "vencido") resumo.totalVencido = v;
      if (row.status === "cancelado") resumo.totalCancelado = v;
    }
    const inadimpl = await prisma.cobranca.findMany({
      where: { status: "vencido" },
      distinct: ["alunoId"],
      select: { alunoId: true },
    });
    resumo.inadimplentes = inadimpl.length;

    return NextResponse.json(resumo);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar resumo financeiro" }, { status: 500 });
  }
}
