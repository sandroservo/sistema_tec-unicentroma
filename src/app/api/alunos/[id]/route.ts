import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { alunoDTO } from "@/lib/dto";
import { toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("aluno:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const aluno = await prisma.aluno.findUnique({ where: { id: parseInt(id) } });
    if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
    return NextResponse.json(alunoDTO(aluno));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar aluno" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("aluno:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.aluno.findUnique({ where: { id: parseInt(id) } });
    const body = await req.json();
    const data = { ...body };
    if ("dataNascimento" in data) data.dataNascimento = toDate(data.dataNascimento);
    const aluno = await prisma.aluno.update({ where: { id: parseInt(id) }, data });
    await logAudit({
      acao: "aluno:update",
      recurso: "Aluno",
      recursoId: aluno.id,
      antes: antes ? alunoDTO(antes) : null,
      depois: alunoDTO(aluno),
    });
    return NextResponse.json(alunoDTO(aluno));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar aluno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("aluno:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.aluno.findUnique({ where: { id: parseInt(id) } });
    if (!antes || antes.excluidoEm) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
    // Soft delete: marca excluidoEm + status inativo (preserva histórico e FKs).
    await prisma.aluno.update({
      where: { id: parseInt(id) },
      data: { excluidoEm: new Date(), status: "inativo" },
    });
    await logAudit({ acao: "aluno:delete", recurso: "Aluno", recursoId: id, antes: alunoDTO(antes) });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar aluno" }, { status: 500 });
  }
}
