import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("professor:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const professor = await prisma.professor.findUnique({ where: { id: parseInt(id) } });
    if (!professor) return NextResponse.json({ error: "Professor não encontrado" }, { status: 404 });
    return NextResponse.json(professor);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar professor" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("professor:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.professor.findUnique({ where: { id: parseInt(id) } });
    const body = await req.json();
    const professor = await prisma.professor.update({ where: { id: parseInt(id) }, data: body });
    await logAudit({ acao: "professor:update", recurso: "Professor", recursoId: professor.id, antes, depois: professor });
    return NextResponse.json(professor);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Professor não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar professor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("professor:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.professor.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "professor:delete", recurso: "Professor", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar professor" }, { status: 500 });
  }
}
