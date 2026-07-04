import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { dateOnly, num } from "@/lib/serialize";

type Debito = {
  tipo: "cobranca" | "parcela";
  id: number;
  descricao: string;
  valor: number;
  vencimento: string | null;
  vencido: boolean;
};

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const alunoId = parseInt(new URL(req.url).searchParams.get("alunoId") ?? "");
    if (!alunoId) return NextResponse.json({ error: "alunoId é obrigatório" }, { status: 400 });

    const aberto = { in: ["pendente", "vencido"] };
    const [cobrancas, parcelas] = await Promise.all([
      prisma.cobranca.findMany({ where: { alunoId, status: aberto } }),
      prisma.parcela.findMany({
        where: { status: aberto, contrato: { alunoId } },
        include: { contrato: { select: { id: true, numParcelas: true } } },
      }),
    ]);

    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);
    const vencido = (v: Date) => v < hoje;

    const itens: Debito[] = [
      ...cobrancas.map((c) => ({
        tipo: "cobranca" as const,
        id: c.id,
        descricao: c.descricao,
        valor: num(c.valor),
        vencimento: dateOnly(c.vencimento),
        vencido: vencido(c.vencimento),
      })),
      ...parcelas.map((p) => ({
        tipo: "parcela" as const,
        id: p.id,
        descricao: `Parcela ${p.numero}/${p.contrato.numParcelas} — Contrato #${p.contrato.id}`,
        valor: num(p.valor),
        vencimento: dateOnly(p.vencimento),
        vencido: vencido(p.vencimento),
      })),
    ].sort((a, b) => (a.vencimento ?? "").localeCompare(b.vencimento ?? ""));

    const total = Math.round(itens.reduce((s, i) => s + i.valor, 0) * 100) / 100;
    return NextResponse.json({ itens, total });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar débitos" }, { status: 500 });
  }
}
