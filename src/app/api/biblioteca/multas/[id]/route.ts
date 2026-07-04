import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("biblioteca:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const multa = await prisma.multa.update({
      where: { id: parseInt(id) },
      data: { paga: body.paga ?? true },
    });
    await logAudit({ acao: "multa:update", recurso: "Multa", recursoId: multa.id, depois: { paga: multa.paga } });
    return NextResponse.json({ id: multa.id, valor: Number(multa.valor), paga: multa.paga });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Multa não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar multa" }, { status: 500 });
  }
}
