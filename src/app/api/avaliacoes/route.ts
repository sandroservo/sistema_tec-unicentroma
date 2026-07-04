import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const TIPOS = ["prova", "trabalho", "seminario", "atividade", "pratica", "recuperacao", "segunda_chamada"] as const;

const avaliacaoDTO = (a: {
  id: number; turmaId: number; disciplinaId: number; tipo: string;
  descricao: string | null; peso: unknown; data: Date | null; criadoEm: Date;
  turma?: { nome: string } | null; disciplina?: { nome: string } | null;
}) => ({
  id: a.id,
  turmaId: a.turmaId,
  turmaNome: a.turma?.nome ?? null,
  disciplinaId: a.disciplinaId,
  disciplinaNome: a.disciplina?.nome ?? null,
  tipo: a.tipo,
  descricao: a.descricao,
  peso: Number(a.peso),
  data: dateOnly(a.data),
  criadoEm: a.criadoEm,
});

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("nota:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const turmaId = sp.get("turmaId");
    const disciplinaId = sp.get("disciplinaId");
    const where: Record<string, unknown> = {};
    if (turmaId) where.turmaId = parseInt(turmaId);
    if (disciplinaId) where.disciplinaId = parseInt(disciplinaId);

    const data = await prisma.avaliacao.findMany({
      where,
      orderBy: [{ data: "asc" }, { id: "asc" }],
      include: { turma: { select: { nome: true } }, disciplina: { select: { nome: true } } },
    });
    return NextResponse.json(data.map(avaliacaoDTO));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar avaliações" }, { status: 500 });
  }
}

const createSchema = z.object({
  turmaId: z.coerce.number().int(),
  disciplinaId: z.coerce.number().int(),
  tipo: z.enum(TIPOS),
  descricao: z.string().optional(),
  peso: z.coerce.number().positive().default(1),
  data: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("nota:lancar");
    if (guard instanceof NextResponse) return guard;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const b = parsed.data;

    const avaliacao = await prisma.avaliacao.create({
      data: {
        turmaId: b.turmaId,
        disciplinaId: b.disciplinaId,
        tipo: b.tipo,
        descricao: b.descricao ?? null,
        peso: b.peso,
        data: toDate(b.data),
      },
    });
    await logAudit({ acao: "avaliacao:create", recurso: "Avaliacao", recursoId: avaliacao.id, depois: avaliacaoDTO(avaliacao) });
    return NextResponse.json(avaliacaoDTO(avaliacao), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar avaliação" }, { status: 500 });
  }
}
