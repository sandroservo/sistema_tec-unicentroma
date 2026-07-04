import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({ status: z.enum(["ativa", "atendida", "cancelada"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("biblioteca:emprestar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const reserva = await prisma.reserva.update({
      where: { id: parseInt(id) },
      data: { status: parsed.data.status },
    });
    await logAudit({ acao: "reserva:update", recurso: "Reserva", recursoId: reserva.id, depois: reserva });
    return NextResponse.json(reserva);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar reserva" }, { status: 500 });
  }
}
