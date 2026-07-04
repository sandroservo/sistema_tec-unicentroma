import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  titulo: z.string().min(1).optional(),
  notaMinima: z.number().nullable().optional(),
});

function dto(q: { id: number; moduloId: number; titulo: string; notaMinima: unknown; criadoEm: Date }) {
  return {
    id: q.id,
    moduloId: q.moduloId,
    titulo: q.titulo,
    notaMinima: q.notaMinima == null ? null : Number(q.notaMinima),
    criadoEm: q.criadoEm,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ead:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const q = await prisma.questionario.findUnique({
      where: { id: parseInt(id) },
      include: { questoes: { orderBy: { ordem: "asc" } } },
    });
    if (!q) return NextResponse.json({ error: "Questionário não encontrado" }, { status: 404 });
    return NextResponse.json({
      ...dto(q),
      questoes: q.questoes.map((qs) => ({
        id: qs.id,
        questionarioId: qs.questionarioId,
        enunciado: qs.enunciado,
        tipo: qs.tipo,
        opcoes: qs.opcoes,
        respostaCorreta: qs.respostaCorreta,
        peso: Number(qs.peso),
        ordem: qs.ordem,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar questionário" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ead:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const q = await prisma.questionario.update({ where: { id: parseInt(id) }, data: parsed.data });
    await logAudit({ acao: "questionario:update", recurso: "Questionario", recursoId: q.id, depois: dto(q) });
    return NextResponse.json(dto(q));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Questionário não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar questionário" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ead:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.questionario.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "questionario:delete", recurso: "Questionario", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar questionário" }, { status: 500 });
  }
}
