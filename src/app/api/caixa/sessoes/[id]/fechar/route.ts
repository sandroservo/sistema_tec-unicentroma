import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { num } from "@/lib/serialize";
import { totaisPorMetodo } from "../../totais";

const schema = z.object({
  valorFechamento: z.number().min(0),
  observacoes: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;
    const { user } = guard;

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    const { id } = await params;
    const s = await prisma.caixaSessao.findUnique({
      where: { id: parseInt(id) },
      include: { recebimentos: { select: { metodo: true, valor: true } } },
    });
    if (!s) return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    if (s.status === "fechado") return NextResponse.json({ error: "Caixa já fechado" }, { status: 409 });

    const totais = totaisPorMetodo(s.recebimentos);
    const esperadoDinheiro = Math.round((num(s.valorAbertura) + totais.dinheiro) * 100) / 100;
    const diferenca = Math.round((b.valorFechamento - esperadoDinheiro) * 100) / 100;

    const agora = new Date();
    await prisma.caixaSessao.update({
      where: { id: s.id },
      data: {
        status: "fechado",
        valorFechamento: b.valorFechamento,
        fechadoEm: agora,
        fechadoPorUserId: user.id ?? null,
        observacoes: b.observacoes ?? s.observacoes,
      },
    });

    await logAudit({
      acao: "caixa:fechar",
      recurso: "CaixaSessao",
      recursoId: s.id,
      depois: { esperadoDinheiro, valorFechamento: b.valorFechamento, diferenca },
    });

    return NextResponse.json({
      id: s.id,
      status: "fechado",
      fechadoEm: agora.toISOString(),
      valorAbertura: num(s.valorAbertura),
      totais,
      esperadoDinheiro,
      valorFechamento: b.valorFechamento,
      diferenca,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao fechar caixa" }, { status: 500 });
  }
}
