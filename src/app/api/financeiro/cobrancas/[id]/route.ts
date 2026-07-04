import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cobrancaDTO } from "@/lib/dto";
import { toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const c = await prisma.cobranca.findUnique({
      where: { id: parseInt(id) },
      include: { aluno: { select: { nome: true } } },
    });
    if (!c) return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });
    return NextResponse.json(
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
    );
  } catch {
    return NextResponse.json({ error: "Erro ao buscar cobrança" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.cobranca.findUnique({ where: { id: parseInt(id) } });
    const body = await req.json();
    const data = { ...body };
    if ("vencimento" in data) data.vencimento = toDate(data.vencimento);
    if ("dataPagamento" in data) data.dataPagamento = toDate(data.dataPagamento);
    if (data.valor !== undefined) data.valor = String(data.valor);

    const cobranca = await prisma.cobranca.update({ where: { id: parseInt(id) }, data });

    if (body.status === "pago") {
      const aluno = await prisma.aluno.findUnique({ where: { id: cobranca.alunoId } });
      await prisma.atividade.create({
        data: {
          tipo: "pagamento",
          descricao: `Pagamento registrado: ${cobranca.descricao} - ${aluno?.nome ?? "Aluno"}`,
        },
      });
    }
    await logAudit({
      acao: "cobranca:update",
      recurso: "Cobranca",
      recursoId: cobranca.id,
      antes: antes ? cobrancaDTO(antes) : null,
      depois: cobrancaDTO(cobranca),
    });
    return NextResponse.json(cobrancaDTO(cobranca));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar cobrança" }, { status: 500 });
  }
}
