import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;

  const [solicitacoes, turmas] = await Promise.all([
    prisma.rematricula.findMany({
      where: { alunoId: guard.alunoId },
      include: { turmaDestino: { include: { curso: { select: { nome: true } } } } },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.turma.findMany({
      where: { status: { in: ["planejada", "em_andamento"] } },
      include: { curso: { select: { nome: true } } },
      orderBy: { nome: "asc" },
    }),
  ]);

  return NextResponse.json({
    solicitacoes: solicitacoes.map((r) => ({
      id: r.id,
      periodoLetivo: r.periodoLetivo,
      turmaDestinoNome: r.turmaDestino.nome,
      cursoNome: r.turmaDestino.curso.nome,
      status: r.status,
      criadoEm: r.criadoEm,
    })),
    turmasDisponiveis: turmas
      .filter((t) => t.vagasOcupadas < t.vagas)
      .map((t) => ({
        id: t.id,
        nome: t.nome,
        cursoNome: t.curso.nome,
        vagasDisponiveis: t.vagas - t.vagasOcupadas,
      })),
  });
}

const createSchema = z.object({
  turmaDestinoId: z.number().int().positive(),
  periodoLetivo: z.string().trim().min(1).max(20),
});

export async function POST(req: Request) {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const turma = await prisma.turma.findUnique({ where: { id: parsed.data.turmaDestinoId } });
  if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });
  if (turma.vagasOcupadas >= turma.vagas) {
    return NextResponse.json({ error: "Turma sem vagas" }, { status: 400 });
  }

  const pendente = await prisma.rematricula.findFirst({
    where: {
      alunoId: guard.alunoId,
      turmaDestinoId: parsed.data.turmaDestinoId,
      status: "solicitada",
    },
    select: { id: true },
  });
  if (pendente) {
    return NextResponse.json({ error: "Já existe solicitação pendente para esta turma" }, { status: 409 });
  }

  const r = await prisma.rematricula.create({
    data: {
      alunoId: guard.alunoId,
      turmaDestinoId: parsed.data.turmaDestinoId,
      periodoLetivo: parsed.data.periodoLetivo,
      status: "solicitada",
    },
    select: { id: true, status: true },
  });

  await logAudit({ acao: "rematricula:create", recurso: "Rematricula", recursoId: r.id, depois: r });
  return NextResponse.json(r, { status: 201 });
}
