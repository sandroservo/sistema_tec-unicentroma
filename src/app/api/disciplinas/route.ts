import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const flatten = (d: {
  id: number; nome: string; descricao: string | null; cargaHoraria: number;
  cursoId: number; professorId: number | null; periodo: number | null;
  obrigatoria: boolean; criadoEm: Date;
  curso?: { nome: string } | null; professor?: { nome: string } | null;
}) => ({
  id: d.id,
  nome: d.nome,
  descricao: d.descricao,
  cargaHoraria: d.cargaHoraria,
  cursoId: d.cursoId,
  professorId: d.professorId,
  periodo: d.periodo,
  obrigatoria: d.obrigatoria,
  cursoNome: d.curso?.nome ?? null,
  professorNome: d.professor?.nome ?? null,
  criadoEm: d.criadoEm,
});

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("disciplina:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const cursoId = sp.get("cursoId");
    const where: Record<string, unknown> = {};
    if (cursoId) where.cursoId = parseInt(cursoId);

    const data = await prisma.disciplina.findMany({
      where,
      orderBy: { nome: "asc" },
      include: { curso: { select: { nome: true } }, professor: { select: { nome: true } } },
    });
    return NextResponse.json(data.map(flatten));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar disciplinas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("disciplina:criar");
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const disciplina = await prisma.disciplina.create({
      data: {
        nome: body.nome,
        descricao: body.descricao ?? null,
        cargaHoraria: body.cargaHoraria,
        cursoId: body.cursoId,
        professorId: body.professorId ?? null,
        periodo: body.periodo ?? null,
        obrigatoria: body.obrigatoria ?? true,
      },
    });
    await logAudit({ acao: "disciplina:create", recurso: "Disciplina", recursoId: disciplina.id, depois: disciplina });
    return NextResponse.json(disciplina, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar disciplina" }, { status: 500 });
  }
}
