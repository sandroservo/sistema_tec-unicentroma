import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

type ContaRow = {
  id: number;
  descricao: string;
  valor: unknown;
  vencimento: Date;
  dataPagamento: Date | null;
  status: string;
  fornecedor: string | null;
  planoContaId: number | null;
  observacoes: string | null;
  criadoEm: Date;
  planoConta?: { nome: string } | null;
};

const HOJE = () => new Date(new Date().toISOString().slice(0, 10));

function contaDTO(c: ContaRow) {
  // status "vencido" calculado no read (não persistido)
  const status =
    c.status === "pendente" && c.vencimento < HOJE() ? "vencido" : c.status;
  return {
    id: c.id,
    descricao: c.descricao,
    valor: Number(c.valor),
    vencimento: dateOnly(c.vencimento),
    dataPagamento: dateOnly(c.dataPagamento),
    status,
    fornecedor: c.fornecedor,
    planoContaId: c.planoContaId,
    planoContaNome: c.planoConta?.nome ?? null,
    observacoes: c.observacoes,
    criadoEm: c.criadoEm,
  };
}

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("despesa:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const status = sp.get("status") ?? undefined;
    const mes = sp.get("mes"); // 1-12
    const ano = sp.get("ano");

    const where: Record<string, unknown> = {};
    // "vencido" é derivado: filtra pendentes já vencidos
    if (status === "vencido") {
      where.status = "pendente";
      where.vencimento = { lt: HOJE() };
    } else if (status) {
      where.status = status;
    }
    if (mes && ano) {
      const m = parseInt(mes) - 1;
      const y = parseInt(ano);
      where.vencimento = { gte: new Date(y, m, 1), lt: new Date(y, m + 1, 1) };
    }

    const data = await prisma.contaPagar.findMany({
      where,
      include: { planoConta: { select: { nome: true } } },
      orderBy: { vencimento: "asc" },
    });
    return NextResponse.json(data.map(contaDTO));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar contas a pagar" }, { status: 500 });
  }
}

const createSchema = z.object({
  descricao: z.string().min(1),
  valor: z.number().positive(),
  vencimento: z.string(),
  fornecedor: z.string().optional(),
  planoContaId: z.number().optional(),
  observacoes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("despesa:criar");
    if (guard instanceof NextResponse) return guard;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    const conta = await prisma.contaPagar.create({
      data: {
        descricao: b.descricao,
        valor: b.valor,
        vencimento: toDate(b.vencimento)!,
        fornecedor: b.fornecedor ?? null,
        planoContaId: b.planoContaId ?? null,
        observacoes: b.observacoes ?? null,
      },
      include: { planoConta: { select: { nome: true } } },
    });
    await logAudit({ acao: "contaPagar:create", recurso: "ContaPagar", recursoId: conta.id, depois: contaDTO(conta) });
    return NextResponse.json(contaDTO(conta), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar conta a pagar" }, { status: 500 });
  }
}
