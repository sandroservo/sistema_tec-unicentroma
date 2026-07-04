import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notaDTO } from "@/lib/dto";
import { requirePermission } from "@/lib/authz";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("nota:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const notas = await prisma.nota.findMany({
      where: { alunoId: parseInt(id) },
      include: { aluno: { select: { nome: true } }, disciplina: { select: { nome: true } } },
    });
    const data = notas.map((n) =>
      notaDTO({
        id: n.id,
        alunoId: n.alunoId,
        alunoNome: n.aluno?.nome ?? null,
        turmaId: n.turmaId,
        disciplinaId: n.disciplinaId,
        disciplinaNome: n.disciplina?.nome ?? null,
        nota1: n.nota1,
        nota2: n.nota2,
        nota3: n.nota3,
        notaFinal: n.notaFinal,
        media: n.media,
        situacao: n.situacao,
        criadoEm: n.criadoEm,
      }),
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar notas do aluno" }, { status: 500 });
  }
}
