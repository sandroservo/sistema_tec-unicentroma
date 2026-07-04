import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cursoDTO } from "@/lib/dto";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("curso:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const curso = await prisma.curso.findUnique({ where: { id: parseInt(id) } });
    if (!curso) return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    return NextResponse.json(cursoDTO(curso));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar curso" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("curso:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.curso.findUnique({ where: { id: parseInt(id) } });
    const body = await req.json();
    if (body.valor !== undefined) body.valor = String(body.valor);
    const curso = await prisma.curso.update({ where: { id: parseInt(id) }, data: body });
    await logAudit({
      acao: "curso:update",
      recurso: "Curso",
      recursoId: curso.id,
      antes: antes ? cursoDTO(antes) : null,
      depois: cursoDTO(curso),
    });
    return NextResponse.json(cursoDTO(curso));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar curso" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("curso:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.curso.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "curso:delete", recurso: "Curso", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar curso" }, { status: 500 });
  }
}
