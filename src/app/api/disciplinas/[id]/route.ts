import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("disciplina:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const d = await prisma.disciplina.findUnique({
      where: { id: parseInt(id) },
      include: { curso: { select: { nome: true } }, professor: { select: { nome: true } } },
    });
    if (!d) return NextResponse.json({ error: "Disciplina não encontrada" }, { status: 404 });
    return NextResponse.json({
      id: d.id,
      nome: d.nome,
      descricao: d.descricao,
      cargaHoraria: d.cargaHoraria,
      cursoId: d.cursoId,
      professorId: d.professorId,
      periodo: d.periodo,
      obrigatoria: d.obrigatoria,
      cursoNome: d.curso?.nome ?? null,
      professorNome: d.professor?.nome ?? null,
      criadoEm: d.criadoEm,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar disciplina" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("disciplina:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.disciplina.findUnique({ where: { id: parseInt(id) } });
    const body = await req.json();
    const disciplina = await prisma.disciplina.update({ where: { id: parseInt(id) }, data: body });
    await logAudit({ acao: "disciplina:update", recurso: "Disciplina", recursoId: disciplina.id, antes, depois: disciplina });
    return NextResponse.json(disciplina);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Disciplina não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar disciplina" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("disciplina:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.disciplina.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "disciplina:delete", recurso: "Disciplina", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar disciplina" }, { status: 500 });
  }
}
