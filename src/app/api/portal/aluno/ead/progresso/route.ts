import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";

const schema = z.object({ aulaId: z.number().int(), concluido: z.boolean() });

export async function PUT(req: Request) {
  try {
    const guard = await requireAluno();
    if (guard instanceof NextResponse) return guard;
    const { alunoId } = guard;

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { aulaId, concluido } = parsed.data;

    // segurança: aula precisa pertencer a um curso matriculado pelo aluno
    const aula = await prisma.aulaEad.findUnique({
      where: { id: aulaId },
      select: { modulo: { select: { cursoId: true } } },
    });
    if (!aula) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    const matricula = await prisma.matricula.findFirst({
      where: { alunoId, status: "ativa", turma: { cursoId: aula.modulo.cursoId } },
      select: { id: true },
    });
    if (!matricula) return NextResponse.json({ error: "Aula não disponível" }, { status: 403 });

    await prisma.progressoAula.upsert({
      where: { aulaId_alunoId: { aulaId, alunoId } },
      create: { aulaId, alunoId, concluido, concluidoEm: concluido ? new Date() : null },
      update: { concluido, concluidoEm: concluido ? new Date() : null },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar progresso" }, { status: 500 });
  }
}
