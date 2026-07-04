import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

type Row = Record<string, any>;
const bolsaDTO = (b: Row) => ({
  ...b,
  percentual: Number(b.percentual),
  dataInicio: dateOnly(b.dataInicio),
  dataFim: dateOnly(b.dataFim),
  alunoNome: b.aluno?.nome ?? undefined,
  aluno: undefined,
});

const bolsaSchema = z.object({
  alunoId: z.number().int(),
  tipo: z.enum(["integral", "parcial"]),
  percentual: z.number().min(0).max(100),
  motivo: z.string().optional(),
  dataInicio: z.string(),
  dataFim: z.string().optional(),
  ativo: z.boolean().default(true),
});

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const where: Record<string, unknown> = {};
    const alunoId = sp.get("alunoId");
    if (alunoId) where.alunoId = parseInt(alunoId);
    const ativo = sp.get("ativo");
    if (ativo != null) where.ativo = ativo === "true";

    const data = await prisma.bolsa.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      include: { aluno: { select: { nome: true } } },
    });
    return NextResponse.json({ data: data.map(bolsaDTO) });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar bolsas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("cobranca:criar");
    if (guard instanceof NextResponse) return guard;

    const parsed = bolsaSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
    const body = parsed.data;

    const bolsa = await prisma.bolsa.create({
      data: {
        alunoId: body.alunoId,
        tipo: body.tipo,
        percentual: body.tipo === "integral" ? 100 : body.percentual,
        motivo: body.motivo ?? null,
        dataInicio: toDate(body.dataInicio)!,
        dataFim: toDate(body.dataFim),
        ativo: body.ativo,
      },
    });
    await logAudit({ acao: "bolsa:create", recurso: "Bolsa", recursoId: bolsa.id, depois: bolsaDTO(bolsa) });
    return NextResponse.json(bolsaDTO(bolsa), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar bolsa" }, { status: 500 });
  }
}
