import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("biblioteca:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const exemplar = await prisma.exemplar.findUnique({
      where: { id: parseInt(id) },
      include: { titulo: true },
    });
    if (!exemplar) return NextResponse.json({ error: "Exemplar não encontrado" }, { status: 404 });
    return NextResponse.json(exemplar);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar exemplar" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("biblioteca:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.exemplar.findUnique({ where: { id: parseInt(id) } });
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if ("status" in body) data.status = body.status;
    if ("localizacao" in body) data.localizacao = body.localizacao ?? null;
    const exemplar = await prisma.exemplar.update({ where: { id: parseInt(id) }, data });
    await logAudit({ acao: "exemplar:update", recurso: "Exemplar", recursoId: exemplar.id, antes, depois: exemplar });
    return NextResponse.json(exemplar);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Exemplar não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar exemplar" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("biblioteca:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.exemplar.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "exemplar:delete", recurso: "Exemplar", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar exemplar" }, { status: 500 });
  }
}
