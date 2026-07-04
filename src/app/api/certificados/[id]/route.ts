import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { certificadoDTO } from "@/lib/dto";
import { requirePermission } from "@/lib/authz";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("certificado:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const c = await prisma.certificado.findUnique({
      where: { id: parseInt(id) },
      include: { aluno: { select: { nome: true } }, curso: { select: { nome: true } } },
    });
    if (!c) return NextResponse.json({ error: "Certificado não encontrado" }, { status: 404 });
    return NextResponse.json(
      certificadoDTO({
        id: c.id,
        alunoId: c.alunoId,
        alunoNome: c.aluno?.nome ?? null,
        cursoId: c.cursoId,
        cursoNome: c.curso?.nome ?? null,
        turmaId: c.turmaId,
        matriculaId: c.matriculaId,
        dataEmissao: c.dataEmissao,
        cargaHoraria: c.cargaHoraria,
        codigo: c.codigo,
        criadoEm: c.criadoEm,
      }),
    );
  } catch {
    return NextResponse.json({ error: "Erro ao buscar certificado" }, { status: 500 });
  }
}
