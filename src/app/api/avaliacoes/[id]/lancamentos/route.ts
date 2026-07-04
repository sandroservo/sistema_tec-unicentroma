import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { assertProfessorTurma } from "@/lib/professorScope";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("nota:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const avaliacaoId = parseInt(id);

    const avaliacao = await prisma.avaliacao.findUnique({ where: { id: avaliacaoId }, select: { turmaId: true } });
    if (!avaliacao) return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });

    const [matriculas, lancamentos] = await Promise.all([
      prisma.matricula.findMany({
        where: { turmaId: avaliacao.turmaId, status: "ativa" },
        include: { aluno: { select: { id: true, nome: true } } },
        orderBy: { aluno: { nome: "asc" } },
      }),
      prisma.lancamentoNota.findMany({ where: { avaliacaoId } }),
    ]);

    const valorPorAluno = new Map(lancamentos.map((l) => [l.alunoId, l.valor == null ? null : Number(l.valor)]));
    const itens = matriculas.map((m) => ({
      alunoId: m.aluno.id,
      alunoNome: m.aluno.nome,
      valor: valorPorAluno.get(m.aluno.id) ?? null,
    }));
    return NextResponse.json(itens);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar lançamentos" }, { status: 500 });
  }
}

const putSchema = z.array(z.object({ alunoId: z.coerce.number().int(), valor: z.number().nullable() }));

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("nota:lancar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const avaliacaoId = parseInt(id);

    const avaliacao = await prisma.avaliacao.findUnique({ where: { id: avaliacaoId }, select: { turmaId: true } });
    if (!avaliacao) return NextResponse.json({ error: "Avaliação não encontrada" }, { status: 404 });
    const escopo = await assertProfessorTurma(avaliacao.turmaId);
    if (escopo) return escopo;

    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    await prisma.$transaction(
      parsed.data.map((item) =>
        prisma.lancamentoNota.upsert({
          where: { avaliacaoId_alunoId: { avaliacaoId, alunoId: item.alunoId } },
          create: { avaliacaoId, alunoId: item.alunoId, valor: item.valor },
          update: { valor: item.valor },
        }),
      ),
    );
    await logAudit({ acao: "lancamento:update", recurso: "Avaliacao", recursoId: avaliacaoId, depois: parsed.data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar lançamentos" }, { status: 500 });
  }
}
