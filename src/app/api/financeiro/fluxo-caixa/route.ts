import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

// Mês "YYYY-MM" a partir de uma data (usa dataPagamento se houver, senão vencimento).
function mesKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export async function GET() {
  try {
    const guard = await requirePermission("despesa:ler");
    if (guard instanceof NextResponse) return guard;

    // Janela: primeiro dia do mês, 11 meses atrás (12 buckets incluindo o atual).
    const now = new Date();
    const inicio = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

    // Buckets ordenados YYYY-MM.
    const buckets: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + i, 1));
      buckets.push(mesKey(d));
    }
    const acc: Record<string, { receita: number; despesa: number }> = {};
    for (const b of buckets) acc[b] = { receita: 0, despesa: 0 };

    const [cobrancas, parcelas, contas] = await Promise.all([
      prisma.cobranca.findMany({
        where: { status: "pago", vencimento: { gte: inicio } },
        select: { valor: true, vencimento: true, dataPagamento: true },
      }),
      prisma.parcela.findMany({
        where: { status: "pago", vencimento: { gte: inicio } },
        select: { valor: true, vencimento: true, dataPagamento: true },
      }),
      prisma.contaPagar.findMany({
        where: { status: "pago", vencimento: { gte: inicio } },
        select: { valor: true, vencimento: true, dataPagamento: true },
      }),
    ]);

    const add = (
      rows: { valor: unknown; vencimento: Date; dataPagamento: Date | null }[],
      campo: "receita" | "despesa",
    ) => {
      for (const r of rows) {
        const k = mesKey(r.dataPagamento ?? r.vencimento);
        if (acc[k]) acc[k][campo] += Number(r.valor);
      }
    };

    add(cobrancas, "receita");
    add(parcelas, "receita");
    add(contas, "despesa");

    const series = buckets.map((mes) => ({
      mes,
      receita: acc[mes].receita,
      despesa: acc[mes].despesa,
      saldo: acc[mes].receita - acc[mes].despesa,
    }));

    const totalReceita = series.reduce((s, m) => s + m.receita, 0);
    const totalDespesa = series.reduce((s, m) => s + m.despesa, 0);

    return NextResponse.json({
      series,
      totais: { totalReceita, totalDespesa, saldo: totalReceita - totalDespesa },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar fluxo de caixa" }, { status: 500 });
  }
}
