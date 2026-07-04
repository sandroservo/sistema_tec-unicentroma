import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { notificarAluno } from "@/lib/notify";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("matricula:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const alunoId = sp.get("alunoId");
    const turmaId = sp.get("turmaId");
    const status = sp.get("status") ?? undefined;
    const where: Record<string, unknown> = {};
    if (alunoId) where.alunoId = parseInt(alunoId);
    if (turmaId) where.turmaId = parseInt(turmaId);
    if (status) where.status = status;

    const data = await prisma.matricula.findMany({
      where,
      orderBy: { dataMatricula: "asc" },
      include: {
        aluno: { select: { nome: true } },
        turma: { select: { nome: true, curso: { select: { nome: true } } } },
      },
    });
    return NextResponse.json(
      data.map((m) => ({
        id: m.id,
        alunoId: m.alunoId,
        alunoNome: m.aluno?.nome ?? null,
        turmaId: m.turmaId,
        turmaNome: m.turma?.nome ?? null,
        cursoNome: m.turma?.curso?.nome ?? null,
        status: m.status,
        dataMatricula: m.dataMatricula,
        observacoes: m.observacoes,
      })),
    );
  } catch {
    return NextResponse.json({ error: "Erro ao buscar matrículas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("matricula:criar");
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const matricula = await prisma.matricula.create({
      data: {
        alunoId: body.alunoId,
        turmaId: body.turmaId,
        status: "ativa",
        observacoes: body.observacoes ?? null,
      },
    });
    await prisma.turma.update({
      where: { id: body.turmaId },
      data: { vagasOcupadas: { increment: 1 } },
    });
    const aluno = await prisma.aluno.findUnique({ where: { id: body.alunoId } });
    const turma = await prisma.turma.findUnique({ where: { id: body.turmaId } });
    await prisma.atividade.create({
      data: {
        tipo: "matricula",
        descricao: `${aluno?.nome ?? "Aluno"} matriculado(a) na turma ${turma?.nome ?? ""}`,
      },
    });
    await logAudit({ acao: "matricula:create", recurso: "Matricula", recursoId: matricula.id, depois: matricula });
    await notificarAluno(body.alunoId, {
      titulo: "Matrícula confirmada",
      mensagem: "Você foi matriculado em uma turma.",
      tipo: "sucesso",
      link: "/portal/aluno",
    });
    return NextResponse.json(matricula, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar matrícula" }, { status: 500 });
  }
}
