import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { solicitarAssinatura } from "@/lib/integrations/assinatura";

const schema = z.object({
  contratoId: z.number().int(),
  signatarioEmail: z.string().email(),
});

export async function POST(req: Request) {
  const guard = await requirePermission("cobranca:editar");
  if (guard instanceof NextResponse) return guard;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
  }

  const contrato = await prisma.contrato.findUnique({
    where: { id: parsed.data.contratoId },
    select: { id: true, aluno: { select: { nome: true } } },
  });
  if (!contrato) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });

  const resultado = await solicitarAssinatura({
    documentoNome: `Contrato #${contrato.id} - ${contrato.aluno?.nome ?? "aluno"}`,
    signatarioEmail: parsed.data.signatarioEmail,
  });

  return NextResponse.json(resultado);
}
