import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import * as z from "zod";

const inscricaoDTO = (i: Record<string, any>) => ({ ...i, nota: i.nota == null ? null : Number(i.nota) });

const patchSchema = z.object({
  nota: z.coerce.number().min(0).nullable().optional(),
  classificacao: z.coerce.number().int().nullable().optional(),
  status: z.enum(["inscrito", "aprovado", "reprovado", "convocado", "matriculado"]).optional(),
  pagamentoStatus: z.enum(["pendente", "pago", "isento"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ inscricaoId: string }> }) {
  try {
    const guard = await requirePermission("selecao:convocar");
    if (guard instanceof NextResponse) return guard;

    const id = Number((await params).inscricaoId);
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    const b = parsed.data;

    const data: Record<string, any> = {};
    if (b.nota !== undefined) data.nota = b.nota;
    if (b.classificacao !== undefined) data.classificacao = b.classificacao;
    if (b.status !== undefined) data.status = b.status;
    if (b.pagamentoStatus !== undefined) {
      data.pagamentoStatus = b.pagamentoStatus;
      data.isento = b.pagamentoStatus === "isento";
    }

    const insc = await prisma.inscricao.update({ where: { id }, data });
    await logAudit({ acao: "inscricao:update", recurso: "Inscricao", recursoId: id, depois: inscricaoDTO(insc) });
    return NextResponse.json(inscricaoDTO(insc));
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar inscrição" }, { status: 500 });
  }
}
