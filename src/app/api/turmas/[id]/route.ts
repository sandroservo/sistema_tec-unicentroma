import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { turmaDTO } from "@/lib/dto";
import { toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("turma:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const t = await prisma.turma.findUnique({
      where: { id: parseInt(id) },
      include: { curso: { select: { nome: true } }, professor: { select: { nome: true } } },
    });
    if (!t) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });
    return NextResponse.json(
      turmaDTO({
        id: t.id,
        nome: t.nome,
        cursoId: t.cursoId,
        cursoNome: t.curso?.nome ?? null,
        professorId: t.professorId,
        professorNome: t.professor?.nome ?? null,
        dataInicio: t.dataInicio,
        dataFim: t.dataFim,
        horario: t.horario,
        vagas: t.vagas,
        vagasOcupadas: t.vagasOcupadas,
        status: t.status,
        criadoEm: t.criadoEm,
      }),
    );
  } catch {
    return NextResponse.json({ error: "Erro ao buscar turma" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("turma:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.turma.findUnique({ where: { id: parseInt(id) } });
    const body = await req.json();
    const data = { ...body };
    if ("dataInicio" in data) data.dataInicio = toDate(data.dataInicio);
    if ("dataFim" in data) data.dataFim = toDate(data.dataFim);
    const turma = await prisma.turma.update({ where: { id: parseInt(id) }, data });
    await logAudit({
      acao: "turma:update",
      recurso: "Turma",
      recursoId: turma.id,
      antes: antes ? turmaDTO(antes) : null,
      depois: turmaDTO(turma),
    });
    return NextResponse.json(turmaDTO(turma));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar turma" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("turma:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.turma.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "turma:delete", recurso: "Turma", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar turma" }, { status: 500 });
  }
}
