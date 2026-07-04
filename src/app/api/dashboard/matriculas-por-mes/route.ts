import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

export async function GET() {
  try {
    const guard = await requirePermission("dashboard:ler");
    if (guard instanceof NextResponse) return guard;

    const rows = await prisma.$queryRaw<Array<{ mes: string; total: bigint }>>`
      SELECT
        TO_CHAR(data_matricula, 'YYYY-MM') as mes,
        COUNT(*) as total
      FROM matriculas
      WHERE data_matricula >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(data_matricula, 'YYYY-MM')
      ORDER BY mes ASC
    `;
    return NextResponse.json(rows.map((r) => ({ mes: r.mes, total: Number(r.total) })));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar matrículas por mês" }, { status: 500 });
  }
}
