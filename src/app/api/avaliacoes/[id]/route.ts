import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { assertProfessorTurma } from "@/lib/professorScope";

const TIPOS = ["prova", "trabalho", "seminario", "atividade", "pratica", "recuperacao", "segunda_chamada"] as const;

const avaliacaoDTO = (a: {
  id: number; turmaId: number; disciplinaId: number; tipo: string;
  descricao: string | null; peso: unknown; data: Date | null; criadoEm: Date;
  turma?: { nome: string } | null; disciplina?: { nome: string } | null;
}) => ({
  id: a.id,
  turmaId: a.turmaId,
  turmaNome: a.turma?.nome ?? null,
  disciplinaId: a.disciplinaId,
  disciplinaNome: a.disciplina?.nome ?? null,
  tipo: a.tipo,
  descricao: a.descricao,
  peso: Number(a.peso),
  data: dateOnly(a.data),
  criadoEm: a.criadoEm,
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("nota:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const avaliacao = await prisma.avaliacao.findUnique({
      where: { id: parseInt(id) },
      include: { turma: { select: { nome: true } }, disciplina: { select: { nome: true } } },
    });
    if (!avaliacao) return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
    return NextResponse.json(avaliacaoDTO(avaliacao));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar avaliação" }, { status: 500 });
  }
}

const patchSchema = z.object({
  tipo: z.enum(TIPOS).optional(),
  descricao: z.string().nullable().optional(),
  peso: z.coerce.number().positive().optional(),
  data: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("nota:lancar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;

    const existing = await prisma.avaliacao.findUnique({ where: { id: parseInt(id) }, select: { turmaId: true } });
    if (!existing) return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
    const escopo = await assertProfessorTurma(existing.turmaId);
    if (escopo) return escopo;

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const b = parsed.data;

    const data: Record<string, unknown> = {};
    if (b.tipo !== undefined) data.tipo = b.tipo;
    if (b.descricao !== undefined) data.descricao = b.descricao;
    if (b.peso !== undefined) data.peso = b.peso;
    if (b.data !== undefined) data.data = toDate(b.data);

    const avaliacao = await prisma.avaliacao.update({
      where: { id: parseInt(id) },
      data,
      include: { turma: { select: { nome: true } }, disciplina: { select: { nome: true } } },
    });
    await logAudit({ acao: "avaliacao:update", recurso: "Avaliacao", recursoId: avaliacao.id, depois: avaliacaoDTO(avaliacao) });
    return NextResponse.json(avaliacaoDTO(avaliacao));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar avaliação" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("nota:lancar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const existing = await prisma.avaliacao.findUnique({ where: { id: parseInt(id) }, select: { turmaId: true } });
    if (existing) {
      const escopo = await assertProfessorTurma(existing.turmaId);
      if (escopo) return escopo;
    }
    // lancamentos removidos por cascade (onDelete: Cascade no schema)
    await prisma.avaliacao.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "avaliacao:delete", recurso: "Avaliacao", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar avaliação" }, { status: 500 });
  }
}
