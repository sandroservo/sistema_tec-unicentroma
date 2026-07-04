import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ead:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const modulo = await prisma.moduloEad.findUnique({
      where: { id: parseInt(id) },
      include: { aulas: { orderBy: { ordem: "asc" } } },
    });
    if (!modulo) return NextResponse.json({ error: "Módulo não encontrado" }, { status: 404 });
    return NextResponse.json(modulo);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar módulo" }, { status: 500 });
  }
}

const patchSchema = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().nullable().optional(),
  ordem: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ead:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const modulo = await prisma.moduloEad.update({ where: { id: parseInt(id) }, data: parsed.data });
    await logAudit({ acao: "ead:modulo:update", recurso: "ModuloEad", recursoId: modulo.id, depois: modulo });
    return NextResponse.json(modulo);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Módulo não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar módulo" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ead:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.moduloEad.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "ead:modulo:delete", recurso: "ModuloEad", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar módulo" }, { status: 500 });
  }
}
