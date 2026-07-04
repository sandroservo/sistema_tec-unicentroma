import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  questionarioId: z.number().int(),
  enunciado: z.string().min(1),
  tipo: z.enum(["multipla", "vf", "dissertativa"]),
  opcoes: z.unknown().optional(),
  respostaCorreta: z.string().nullable().optional(),
  peso: z.number().optional(),
  ordem: z.number().int().optional(),
});

// GET aberto a qualquer usuário logado (aluno responde o quiz); respostaCorreta NUNCA é exposta aqui.
export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const sp = new URL(req.url).searchParams;
    const questionarioId = sp.get("questionarioId");
    const where = questionarioId ? { questionarioId: parseInt(questionarioId) } : {};
    const data = await prisma.questao.findMany({
      where,
      orderBy: { ordem: "asc" },
      select: {
        id: true,
        questionarioId: true,
        enunciado: true,
        tipo: true,
        opcoes: true,
        peso: true,
        ordem: true,
      },
    });
    return NextResponse.json({ data: data.map((q) => ({ ...q, peso: Number(q.peso) })) });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar questões" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("ead:criar");
    if (guard instanceof NextResponse) return guard;
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const d = parsed.data;
    const q = await prisma.questao.create({
      data: {
        questionarioId: d.questionarioId,
        enunciado: d.enunciado,
        tipo: d.tipo,
        opcoes: (d.opcoes ?? undefined) as never,
        respostaCorreta: d.respostaCorreta ?? null,
        peso: d.peso ?? 1,
        ordem: d.ordem ?? 0,
      },
    });
    await logAudit({ acao: "questao:create", recurso: "Questao", recursoId: q.id });
    return NextResponse.json({ ...q, peso: Number(q.peso) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar questão" }, { status: 500 });
  }
}
