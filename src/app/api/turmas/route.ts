import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { turmaDTO } from "@/lib/dto";
import { toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const flatten = (t: {
  id: number; nome: string; cursoId: number; professorId: number | null;
  dataInicio: Date; dataFim: Date | null; horario: string | null;
  vagas: number; vagasOcupadas: number; status: string; criadoEm: Date;
  curso?: { nome: string } | null; professor?: { nome: string } | null;
}) =>
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
  });

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("turma:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const cursoId = sp.get("cursoId");
    const status = sp.get("status") ?? undefined;
    const where: Record<string, unknown> = {};
    if (cursoId) where.cursoId = parseInt(cursoId);
    if (status) where.status = status;

    const data = await prisma.turma.findMany({
      where,
      orderBy: { dataInicio: "asc" },
      include: { curso: { select: { nome: true } }, professor: { select: { nome: true } } },
    });
    return NextResponse.json(data.map(flatten));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar turmas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("turma:criar");
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const turma = await prisma.turma.create({
      data: {
        nome: body.nome,
        cursoId: body.cursoId,
        professorId: body.professorId ?? null,
        dataInicio: toDate(body.dataInicio)!,
        dataFim: toDate(body.dataFim),
        horario: body.horario ?? null,
        vagas: body.vagas,
        vagasOcupadas: 0,
        status: body.status ?? "planejada",
      },
    });
    await logAudit({ acao: "turma:create", recurso: "Turma", recursoId: turma.id, depois: turmaDTO(turma) });
    return NextResponse.json(turmaDTO(turma), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar turma" }, { status: 500 });
  }
}
