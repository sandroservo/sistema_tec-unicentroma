import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("biblioteca:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const titulo = await prisma.titulo.findUnique({
      where: { id: parseInt(id) },
      include: { exemplares: { orderBy: { codigo: "asc" } } },
    });
    if (!titulo) return NextResponse.json({ error: "Título não encontrado" }, { status: 404 });
    return NextResponse.json(titulo);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar título" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("biblioteca:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.titulo.findUnique({ where: { id: parseInt(id) } });
    const body = await req.json();
    const data = { ...body };
    if ("ano" in data) data.ano = data.ano != null ? Number(data.ano) : null;
    const titulo = await prisma.titulo.update({ where: { id: parseInt(id) }, data });
    await logAudit({ acao: "titulo:update", recurso: "Titulo", recursoId: titulo.id, antes, depois: titulo });
    return NextResponse.json(titulo);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Título não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar título" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("biblioteca:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.titulo.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "titulo:delete", recurso: "Titulo", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar título" }, { status: 500 });
  }
}
