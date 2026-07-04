import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  nota: z.number(),
  feedback: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ead:corrigir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const entrega = await prisma.entregaAtividade.update({
      where: { id: parseInt(id) },
      data: { nota: parsed.data.nota, feedback: parsed.data.feedback ?? null, status: "corrigida" },
    });
    await logAudit({ acao: "entrega:corrigir", recurso: "EntregaAtividade", recursoId: entrega.id });
    return NextResponse.json({
      id: entrega.id,
      nota: entrega.nota == null ? null : Number(entrega.nota),
      feedback: entrega.feedback,
      status: entrega.status,
    });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao corrigir entrega" }, { status: 500 });
  }
}
