import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  enunciado: z.string().min(1).optional(),
  tipo: z.enum(["multipla", "vf", "dissertativa"]).optional(),
  opcoes: z.unknown().optional(),
  respostaCorreta: z.string().nullable().optional(),
  peso: z.number().optional(),
  ordem: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ead:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const q = await prisma.questao.update({
      where: { id: parseInt(id) },
      data: parsed.data as never,
    });
    await logAudit({ acao: "questao:update", recurso: "Questao", recursoId: q.id });
    return NextResponse.json({ ...q, peso: Number(q.peso) });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar questão" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ead:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.questao.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "questao:delete", recurso: "Questao", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar questão" }, { status: 500 });
  }
}
