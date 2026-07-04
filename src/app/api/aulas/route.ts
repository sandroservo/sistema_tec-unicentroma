import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const flatten = (a: {
  id: number; turmaId: number; disciplinaId: number; data: Date;
  conteudo: string; observacoes: string | null; criadoEm: Date;
  turma?: { nome: string } | null; disciplina?: { nome: string } | null;
}) => ({
  id: a.id,
  turmaId: a.turmaId,
  disciplinaId: a.disciplinaId,
  turmaNome: a.turma?.nome ?? null,
  disciplinaNome: a.disciplina?.nome ?? null,
  data: dateOnly(a.data),
  conteudo: a.conteudo,
  observacoes: a.observacoes,
  criadoEm: a.criadoEm,
});

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("aula:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const where: Record<string, unknown> = {};
    if (sp.get("turmaId")) where.turmaId = parseInt(sp.get("turmaId")!);
    if (sp.get("disciplinaId")) where.disciplinaId = parseInt(sp.get("disciplinaId")!);
    if (sp.get("data")) where.data = toDate(sp.get("data"));

    const data = await prisma.aula.findMany({
      where,
      orderBy: { data: "desc" },
      include: { turma: { select: { nome: true } }, disciplina: { select: { nome: true } } },
    });
    return NextResponse.json(data.map(flatten));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar aulas" }, { status: 500 });
  }
}

const createSchema = z.object({
  turmaId: z.coerce.number().int(),
  disciplinaId: z.coerce.number().int(),
  data: z.string().min(1),
  conteudo: z.string().min(1),
  observacoes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("aula:criar");
    if (guard instanceof NextResponse) return guard;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

    const aula = await prisma.aula.create({
      data: {
        turmaId: parsed.data.turmaId,
        disciplinaId: parsed.data.disciplinaId,
        data: toDate(parsed.data.data)!,
        conteudo: parsed.data.conteudo,
        observacoes: parsed.data.observacoes ?? null,
      },
      include: { turma: { select: { nome: true } }, disciplina: { select: { nome: true } } },
    });
    await logAudit({ acao: "aula:create", recurso: "Aula", recursoId: aula.id, depois: flatten(aula) });
    return NextResponse.json(flatten(aula), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar aula" }, { status: 500 });
  }
}
