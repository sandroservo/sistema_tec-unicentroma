import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  nome: z.string().min(1).optional(),
  bloco: z.string().optional().nullable(),
  capacidade: z.number().int().nonnegative().optional(),
  tipo: z.enum(["sala", "laboratorio", "auditorio"]).optional(),
  recursos: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("sala:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const sala = await prisma.sala.findUnique({ where: { id: parseInt(id) } });
    if (!sala) return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
    return NextResponse.json(sala);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar sala" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("sala:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const antes = await prisma.sala.findUnique({ where: { id: parseInt(id) } });
    const sala = await prisma.sala.update({ where: { id: parseInt(id) }, data: parsed.data });
    await logAudit({ acao: "sala:update", recurso: "Sala", recursoId: sala.id, antes, depois: sala });
    return NextResponse.json(sala);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Sala não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar sala" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("sala:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.sala.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "sala:delete", recurso: "Sala", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar sala" }, { status: 500 });
  }
}
