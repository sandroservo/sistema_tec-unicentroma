import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

function parcelaDTO(p: any) {
  return {
    id: p.id,
    contratoId: p.contratoId,
    numero: p.numero,
    valor: Number(p.valor),
    vencimento: dateOnly(p.vencimento),
    dataPagamento: dateOnly(p.dataPagamento),
    status: p.status,
    metodoPagamento: p.metodoPagamento,
    criadoEm: p.criadoEm,
  };
}

function contratoDetalheDTO(c: any) {
  const parcelas = (c.parcelas ?? []).map(parcelaDTO);
  return {
    id: c.id,
    alunoId: c.alunoId,
    alunoNome: c.aluno?.nome ?? null,
    cursoId: c.cursoId,
    turmaId: c.turmaId,
    valorTotal: Number(c.valorTotal),
    numParcelas: c.numParcelas,
    diaVencimento: c.diaVencimento,
    dataInicio: dateOnly(c.dataInicio),
    descontoPercentual: Number(c.descontoPercentual),
    bolsaId: c.bolsaId,
    convenioId: c.convenioId,
    status: c.status,
    observacoes: c.observacoes,
    criadoEm: c.criadoEm,
    parcelas,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const c = await prisma.contrato.findUnique({
      where: { id: parseInt(id) },
      include: { aluno: { select: { nome: true } }, parcelas: { orderBy: { numero: "asc" } } },
    });
    if (!c) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    return NextResponse.json(contratoDetalheDTO(c));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar contrato" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const body = await req.json();
    // Só status/observacoes — não regenera parcelas.
    const data: Record<string, unknown> = {};
    if ("status" in body) data.status = body.status;
    if ("observacoes" in body) data.observacoes = body.observacoes;
    const contrato = await prisma.contrato.update({ where: { id: parseInt(id) }, data });
    await logAudit({ acao: "contrato:update", recurso: "Contrato", recursoId: contrato.id, depois: { status: contrato.status } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar contrato" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.contrato.deleteMany({ where: { id: parseInt(id) } }); // cascade remove parcelas
    await logAudit({ acao: "contrato:delete", recurso: "Contrato", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar contrato" }, { status: 500 });
  }
}
