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
  const status = c.status === "pendente" && c.vencimento < HOJE() ? "vencido" : c.status;
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("despesa:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const conta = await prisma.contaPagar.findUnique({
      where: { id: parseInt(id) },
      include: { planoConta: { select: { nome: true } } },
    });
    if (!conta) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    return NextResponse.json(contaDTO(conta));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar conta" }, { status: 500 });
  }
}

const patchSchema = z.object({
  status: z.enum(["pendente", "pago", "vencido", "cancelado"]).optional(),
  dataPagamento: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("despesa:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    const data: Record<string, unknown> = {};
    if (b.status !== undefined) data.status = b.status;
    if (b.dataPagamento !== undefined) data.dataPagamento = toDate(b.dataPagamento);
    if (b.status === "pago" && !b.dataPagamento) data.dataPagamento = new Date();

    const conta = await prisma.contaPagar.update({
      where: { id: parseInt(id) },
      data,
      include: { planoConta: { select: { nome: true } } },
    });
    await logAudit({ acao: "contaPagar:update", recurso: "ContaPagar", recursoId: conta.id, depois: contaDTO(conta) });
    return NextResponse.json(contaDTO(conta));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar conta" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("despesa:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.contaPagar.delete({ where: { id: parseInt(id) } });
    await logAudit({ acao: "contaPagar:delete", recurso: "ContaPagar", recursoId: parseInt(id) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao excluir conta" }, { status: 500 });
  }
}
