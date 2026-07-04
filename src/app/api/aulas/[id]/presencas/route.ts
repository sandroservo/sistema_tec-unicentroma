import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { assertProfessorTurma } from "@/lib/professorScope";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("frequencia:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const aulaId = parseInt(id);

    const aula = await prisma.aula.findUnique({ where: { id: aulaId } });
    if (!aula) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });

    const [matriculas, presencas] = await Promise.all([
      prisma.matricula.findMany({
        where: { turmaId: aula.turmaId, status: "ativa" },
        include: { aluno: { select: { id: true, nome: true } } },
        orderBy: { aluno: { nome: "asc" } },
      }),
      prisma.presenca.findMany({ where: { aulaId } }),
    ]);

    const byAluno = new Map(presencas.map((p) => [p.alunoId, p]));
    const data = matriculas.map((m) => {
      const p = byAluno.get(m.alunoId);
      return {
        alunoId: m.alunoId,
        alunoNome: m.aluno.nome,
        status: p?.status ?? "presente",
        justificativa: p?.justificativa ?? null,
      };
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar presenças" }, { status: 500 });
  }
}

const putSchema = z.array(
  z.object({
    alunoId: z.coerce.number().int(),
    status: z.enum(["presente", "falta", "atraso", "justificada"]),
    justificativa: z.string().optional().nullable(),
  }),
);

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("frequencia:lancar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const aulaId = parseInt(id);

    const aula = await prisma.aula.findUnique({ where: { id: aulaId }, select: { turmaId: true } });
    if (!aula) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    const escopo = await assertProfessorTurma(aula.turmaId);
    if (escopo) return escopo;

    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

    await prisma.$transaction(
      parsed.data.map((item) =>
        prisma.presenca.upsert({
          where: { aulaId_alunoId: { aulaId, alunoId: item.alunoId } },
          create: { aulaId, alunoId: item.alunoId, status: item.status, justificativa: item.justificativa ?? null },
          update: { status: item.status, justificativa: item.justificativa ?? null },
        }),
      ),
    );
    await logAudit({ acao: "presenca:update", recurso: "Aula", recursoId: aulaId, depois: parsed.data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao lançar presenças" }, { status: 500 });
  }
}
