import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";

const createSchema = z.object({
  questionarioId: z.number().int(),
  respostas: z.record(z.string(), z.string()),
});

export async function GET(req: Request) {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;
  try {
    const sp = new URL(req.url).searchParams;
    const questionarioId = sp.get("questionarioId");
    if (!questionarioId) return NextResponse.json({ error: "questionarioId obrigatório" }, { status: 400 });
    const data = await prisma.tentativaQuestionario.findMany({
      where: { questionarioId: parseInt(questionarioId), alunoId: guard.alunoId },
      orderBy: { criadoEm: "desc" },
      select: { id: true, nota: true, criadoEm: true },
    });
    return NextResponse.json({
      data: data.map((t) => ({ id: t.id, nota: t.nota == null ? null : Number(t.nota), criadoEm: t.criadoEm })),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar tentativas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const { questionarioId, respostas } = parsed.data;

    const questionario = await prisma.questionario.findUnique({
      where: { id: questionarioId },
      include: { questoes: true },
    });
    if (!questionario) return NextResponse.json({ error: "Questionário não encontrado" }, { status: 404 });

    // Autocorreção: só questões objetivas (multipla/vf). Dissertativas ficam p/ correção manual.
    let totalPeso = 0;
    let acertos = 0;
    for (const q of questionario.questoes) {
      if (q.tipo === "dissertativa") continue;
      const peso = Number(q.peso);
      totalPeso += peso;
      const dada = (respostas[String(q.id)] ?? "").trim().toLowerCase();
      const correta = (q.respostaCorreta ?? "").trim().toLowerCase();
      if (correta && dada === correta) acertos += peso;
    }
    // ponytail: sem questões objetivas → nota 0 (nada a autocorrigir); correção manual futura ajusta.
    const nota = totalPeso > 0 ? (10 * acertos) / totalPeso : 0;

    const tentativa = await prisma.tentativaQuestionario.create({
      data: { questionarioId, alunoId: guard.alunoId, respostas, nota },
    });

    const notaMin = questionario.notaMinima == null ? null : Number(questionario.notaMinima);
    return NextResponse.json(
      { id: tentativa.id, nota, aprovado: notaMin == null ? null : nota >= notaMin },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Erro ao enviar tentativa" }, { status: 500 });
  }
}
