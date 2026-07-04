import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cobrancaDTO } from "@/lib/dto";
import { toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const alunoId = sp.get("alunoId");
    const status = sp.get("status") ?? undefined;
    const where: Record<string, unknown> = {};
    if (alunoId) where.alunoId = parseInt(alunoId);
    if (status) where.status = status;

    const data = await prisma.cobranca.findMany({
      where,
      orderBy: { vencimento: "asc" },
      include: { aluno: { select: { nome: true } } },
    });
    return NextResponse.json(
      data.map((c) =>
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
      ),
    );
  } catch {
    return NextResponse.json({ error: "Erro ao buscar cobranças" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("cobranca:criar");
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const cobranca = await prisma.cobranca.create({
      data: {
        alunoId: body.alunoId,
        descricao: body.descricao,
        valor: String(body.valor),
        vencimento: toDate(body.vencimento)!,
        status: "pendente",
        observacoes: body.observacoes ?? null,
      },
    });
    await logAudit({ acao: "cobranca:create", recurso: "Cobranca", recursoId: cobranca.id, depois: cobrancaDTO(cobranca) });
    return NextResponse.json(cobrancaDTO(cobranca), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar cobrança" }, { status: 500 });
  }
}
