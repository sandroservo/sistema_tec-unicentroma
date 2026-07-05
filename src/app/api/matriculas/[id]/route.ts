import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("matricula:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const m = await prisma.matricula.findUnique({
      where: { id: parseInt(id) },
      include: {
        aluno: { select: { nome: true } },
        turma: { select: { nome: true, curso: { select: { nome: true } } } },
      },
    });
    if (!m) return NextResponse.json({ error: "Matrícula não encontrada" }, { status: 404 });
    return NextResponse.json({
      id: m.id,
      alunoId: m.alunoId,
      alunoNome: m.aluno?.nome ?? null,
      turmaId: m.turmaId,
      turmaNome: m.turma?.nome ?? null,
      cursoNome: m.turma?.curso?.nome ?? null,
      status: m.status,
      dataMatricula: m.dataMatricula,
      observacoes: m.observacoes,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar matrícula" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("matricula:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const matriculaId = parseInt(id);

    const removida = await prisma.$transaction(async (tx) => {
      const m = await tx.matricula.findUnique({ where: { id: matriculaId } });
      if (!m) return null;
      // Devolve a vaga à turma se a matrícula estava ativa (nunca deixa negativo).
      if (m.status === "ativa") {
        await tx.turma.updateMany({
          where: { id: m.turmaId, vagasOcupadas: { gt: 0 } },
          data: { vagasOcupadas: { decrement: 1 } },
        });
      }
      await tx.matricula.delete({ where: { id: matriculaId } });
      return m;
    });

    if (!removida) return NextResponse.json({ error: "Matrícula não encontrada" }, { status: 404 });
    await logAudit({ acao: "matricula:delete", recurso: "Matricula", recursoId: matriculaId, antes: removida });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir matrícula" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("matricula:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.matricula.findUnique({ where: { id: parseInt(id) } });
    const body = await req.json();
    const matricula = await prisma.matricula.update({ where: { id: parseInt(id) }, data: body });
    await logAudit({ acao: "matricula:update", recurso: "Matricula", recursoId: matricula.id, antes, depois: matricula });
    return NextResponse.json(matricula);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Matrícula não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar matrícula" }, { status: 500 });
  }
}
