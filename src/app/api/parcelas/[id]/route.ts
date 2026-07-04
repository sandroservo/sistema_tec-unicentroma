import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const p = await prisma.parcela.findUnique({ where: { id: parseInt(id) } });
    if (!p) return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
    return NextResponse.json(parcelaDTO(p));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar parcela" }, { status: 500 });
  }
}

const patchSchema = z.object({
  status: z.enum(["pendente", "pago", "vencido", "cancelado", "renegociada"]).optional(),
  metodoPagamento: z.enum(["pix", "boleto", "cartao", "dinheiro"]).optional(),
  dataPagamento: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    // TODO: integrar gateway PIX/boleto — baixa manual por enquanto.
    const data: Record<string, unknown> = {};
    if (b.status !== undefined) data.status = b.status;
    if (b.metodoPagamento !== undefined) data.metodoPagamento = b.metodoPagamento;
    if (b.dataPagamento !== undefined) data.dataPagamento = toDate(b.dataPagamento);
    if (b.status === "pago" && !b.dataPagamento) data.dataPagamento = new Date();

    const p = await prisma.parcela.update({ where: { id: parseInt(id) }, data });
    await logAudit({ acao: "parcela:update", recurso: "Parcela", recursoId: p.id, depois: parcelaDTO(p) });
    return NextResponse.json(parcelaDTO(p));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar parcela" }, { status: 500 });
  }
}
