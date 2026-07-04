import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { gerarCobrancaPix } from "@/lib/integrations/banco";

const schema = z.object({ parcelaId: z.number().int() });

export async function POST(req: Request) {
  const guard = await requirePermission("cobranca:editar");
  if (guard instanceof NextResponse) return guard;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
  }

  const parcela = await prisma.parcela.findUnique({
    where: { id: parsed.data.parcelaId },
    include: { contrato: { select: { aluno: { select: { nome: true } } } } },
  });
  if (!parcela) return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });

  const resultado = await gerarCobrancaPix({
    valor: Number(parcela.valor),
    descricao: `Parcela ${parcela.numero} - ${parcela.contrato.aluno?.nome ?? "aluno"}`,
    vencimento: parcela.vencimento.toISOString().slice(0, 10),
  });

  // TODO: persistir txid na parcela quando provedor real
  return NextResponse.json(resultado);
}
