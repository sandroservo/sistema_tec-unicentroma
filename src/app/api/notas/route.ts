import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notaDTO } from "@/lib/dto";
import { calcularMedia, calcularSituacao } from "@/lib/notas";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { assertProfessorTurma } from "@/lib/professorScope";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("nota:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const alunoId = sp.get("alunoId");
    const turmaId = sp.get("turmaId");
    const disciplinaId = sp.get("disciplinaId");
    const where: Record<string, unknown> = {};
    if (alunoId) where.alunoId = parseInt(alunoId);
    if (turmaId) where.turmaId = parseInt(turmaId);
    if (disciplinaId) where.disciplinaId = parseInt(disciplinaId);

    const data = await prisma.nota.findMany({
      where,
      include: { aluno: { select: { nome: true } }, disciplina: { select: { nome: true } } },
    });
    return NextResponse.json(
      data.map((n) =>
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
      ),
    );
  } catch {
    return NextResponse.json({ error: "Erro ao buscar notas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("nota:lancar");
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const escopo = await assertProfessorTurma(body.turmaId);
    if (escopo) return escopo;
    const n1 = body.nota1 != null ? String(body.nota1) : null;
    const n2 = body.nota2 != null ? String(body.nota2) : null;
    const n3 = body.nota3 != null ? String(body.nota3) : null;
    const nf = body.notaFinal != null ? String(body.notaFinal) : null;
    const media = calcularMedia(n1, n2, n3, nf);
    const situacao = calcularSituacao(media);
    const nota = await prisma.nota.create({
      data: {
        alunoId: body.alunoId,
        turmaId: body.turmaId,
        disciplinaId: body.disciplinaId,
        nota1: n1,
        nota2: n2,
        nota3: n3,
        notaFinal: nf,
        media: media !== null ? String(media) : null,
        situacao,
      },
    });
    await logAudit({ acao: "nota:create", recurso: "Nota", recursoId: nota.id, depois: notaDTO(nota) });
    return NextResponse.json(notaDTO(nota), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar nota" }, { status: 500 });
  }
}
