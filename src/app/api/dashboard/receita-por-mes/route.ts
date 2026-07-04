import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

export async function GET() {
  try {
    const guard = await requirePermission("dashboard:ler");
    if (guard instanceof NextResponse) return guard;

    const rows = await prisma.$queryRaw<Array<{ mes: string; recebido: unknown; pendente: unknown }>>`
      SELECT
        TO_CHAR(vencimento, 'YYYY-MM') as mes,
        COALESCE(SUM(CASE WHEN status = 'pago' THEN valor::numeric ELSE 0 END), 0) as recebido,
        COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor::numeric ELSE 0 END), 0) as pendente
      FROM cobrancas
      WHERE vencimento >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(vencimento, 'YYYY-MM')
      ORDER BY mes ASC
    `;
    return NextResponse.json(
      rows.map((r) => ({ mes: r.mes, recebido: Number(r.recebido), pendente: Number(r.pendente) })),
    );
  } catch {
    return NextResponse.json({ error: "Erro ao buscar receita por mês" }, { status: 500 });
  }
}
