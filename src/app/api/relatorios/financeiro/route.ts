import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { dateOnly } from "@/lib/serialize";
import { periodo, LIMITE_LINHAS } from "../periodo";

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("relatorio:ler");
    if (guard instanceof NextResponse) return guard;

    const { de, ate } = periodo(new URL(req.url).searchParams);
    const hoje = new Date();

    const [cobrancasPagas, parcelasPagas, abertasCob, abertasPar, bolsas] = await Promise.all([
      prisma.cobranca.findMany({
        where: { status: "pago", dataPagamento: { gte: de, lte: ate } },
        include: { aluno: { select: { nome: true } } },
      }),
      prisma.parcela.findMany({
        where: { status: "pago", dataPagamento: { gte: de, lte: ate } },
        include: { contrato: { select: { id: true, aluno: { select: { nome: true } } } } },
      }),
      prisma.cobranca.findMany({ where: { status: { in: ["pendente", "vencido"] } }, select: { valor: true, vencimento: true } }),
      prisma.parcela.findMany({ where: { status: { in: ["pendente", "vencido"] } }, select: { valor: true, vencimento: true } }),
      prisma.bolsa.aggregate({ where: { ativo: true }, _count: true, _sum: { percentual: true } }),
    ]);

    const linhas = [
      ...cobrancasPagas.map((c) => ({
        aluno: c.aluno.nome,
        descricao: c.descricao,
        valor: Number(c.valor),
        metodo: c.metodoPagamento ?? "não informado",
        dataPagamento: dateOnly(c.dataPagamento),
      })),
      ...parcelasPagas.map((p) => ({
        aluno: p.contrato.aluno.nome,
        descricao: `Parcela ${p.numero} — contrato #${p.contrato.id}`,
        valor: Number(p.valor),
        metodo: p.metodoPagamento ?? "não informado",
        dataPagamento: dateOnly(p.dataPagamento),
      })),
    ]
      .sort((a, b) => (b.dataPagamento ?? "").localeCompare(a.dataPagamento ?? ""))
      .slice(0, LIMITE_LINHAS);

    // Em aberto (todas as datas): vencido = vencimento < hoje; pendente = a vencer.
    const abertas = [...abertasCob, ...abertasPar];
    const pendente = r2(abertas.filter((a) => a.vencimento >= hoje).reduce((s, a) => s + Number(a.valor), 0));
    const vencido = r2(abertas.filter((a) => a.vencimento < hoje).reduce((s, a) => s + Number(a.valor), 0));

    const porMetodoMap = new Map<string, number>();
    const porMesMap = new Map<string, number>();
    for (const l of linhas) {
      porMetodoMap.set(l.metodo, (porMetodoMap.get(l.metodo) ?? 0) + l.valor);
      const mes = l.dataPagamento ? `${l.dataPagamento.slice(5, 7)}/${l.dataPagamento.slice(0, 4)}` : "?";
      porMesMap.set(mes, (porMesMap.get(mes) ?? 0) + l.valor);
    }

    return NextResponse.json({
      totais: {
        recebidoPeriodo: r2(linhas.reduce((s, l) => s + l.valor, 0)),
        pendente,
        vencido,
        bolsasAtivas: bolsas._count,
        valorBolsas: Number(bolsas._sum.percentual ?? 0), // ponytail: Σ percentual das bolsas ativas (estimativa; sem valor monetário real)
      },
      porMetodo: [...porMetodoMap].map(([metodo, valor]) => ({ metodo, valor: r2(valor) })),
      porMes: [...porMesMap]
        .map(([mes, recebido]) => ({ mes, recebido: r2(recebido) }))
        .sort((a, b) => `${a.mes.slice(3)}-${a.mes.slice(0, 2)}`.localeCompare(`${b.mes.slice(3)}-${b.mes.slice(0, 2)}`)),
      linhas,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar relatório financeiro" }, { status: 500 });
  }
}
