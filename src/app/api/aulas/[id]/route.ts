import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { assertProfessorTurma } from "@/lib/professorScope";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("aula:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const aula = await prisma.aula.findUnique({
      where: { id: parseInt(id) },
      include: {
        turma: { select: { nome: true } },
        disciplina: { select: { nome: true } },
        presencas: { include: { aluno: { select: { nome: true } } } },
      },
    });
    if (!aula) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    return NextResponse.json({
      id: aula.id,
      turmaId: aula.turmaId,
      disciplinaId: aula.disciplinaId,
      turmaNome: aula.turma?.nome ?? null,
      disciplinaNome: aula.disciplina?.nome ?? null,
      data: dateOnly(aula.data),
      conteudo: aula.conteudo,
      observacoes: aula.observacoes,
      criadoEm: aula.criadoEm,
      presencas: aula.presencas.map((p) => ({
        alunoId: p.alunoId,
        alunoNome: p.aluno?.nome ?? null,
        status: p.status,
        justificativa: p.justificativa,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar aula" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("aula:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const existing = await prisma.aula.findUnique({ where: { id: parseInt(id) }, select: { turmaId: true } });
    if (!existing) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    const escopo = await assertProfessorTurma(existing.turmaId);
    if (escopo) return escopo;
    const body = await req.json();
    if ("turmaId" in body && body.turmaId !== existing.turmaId) {
      const escopoNova = await assertProfessorTurma(body.turmaId);
      if (escopoNova) return escopoNova;
    }
    const data: Record<string, unknown> = {};
    if ("turmaId" in body) data.turmaId = body.turmaId;
    if ("disciplinaId" in body) data.disciplinaId = body.disciplinaId;
    if ("data" in body) data.data = toDate(body.data);
    if ("conteudo" in body) data.conteudo = body.conteudo;
    if ("observacoes" in body) data.observacoes = body.observacoes ?? null;
    const aula = await prisma.aula.update({ where: { id: parseInt(id) }, data });
    await logAudit({ acao: "aula:update", recurso: "Aula", recursoId: aula.id, depois: { ...aula, data: dateOnly(aula.data) } });
    return NextResponse.json({ ...aula, data: dateOnly(aula.data) });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar aula" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("aula:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const existing = await prisma.aula.findUnique({ where: { id: parseInt(id) }, select: { turmaId: true } });
    if (existing) {
      const escopo = await assertProfessorTurma(existing.turmaId);
      if (escopo) return escopo;
    }
    await prisma.aula.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "aula:delete", recurso: "Aula", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar aula" }, { status: 500 });
  }
}
