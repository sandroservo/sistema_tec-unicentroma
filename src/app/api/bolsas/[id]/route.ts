import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

type Row = Record<string, any>;
const bolsaDTO = (b: Row) => ({
  ...b,
  percentual: Number(b.percentual),
  dataInicio: dateOnly(b.dataInicio),
  dataFim: dateOnly(b.dataFim),
  alunoNome: b.aluno?.nome ?? undefined,
  aluno: undefined,
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const bolsa = await prisma.bolsa.findUnique({
      where: { id: parseInt(id) },
      include: { aluno: { select: { nome: true } } },
    });
    if (!bolsa) return NextResponse.json({ error: "Bolsa não encontrada" }, { status: 404 });
    return NextResponse.json(bolsaDTO(bolsa));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar bolsa" }, { status: 500 });
  }
}

const patchSchema = z.object({
  tipo: z.enum(["integral", "parcial"]).optional(),
  percentual: z.number().min(0).max(100).optional(),
  motivo: z.string().nullable().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
  alunoId: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.bolsa.findUnique({ where: { id: parseInt(id) } });
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const body = parsed.data;
    const data: Record<string, unknown> = {};
    if (body.tipo !== undefined) data.tipo = body.tipo;
    if (body.percentual !== undefined) data.percentual = body.percentual;
    if (body.motivo !== undefined) data.motivo = body.motivo;
    if (body.dataInicio !== undefined) data.dataInicio = toDate(body.dataInicio);
    if (body.dataFim !== undefined) data.dataFim = toDate(body.dataFim);
    if (body.ativo !== undefined) data.ativo = body.ativo;
    if (body.alunoId !== undefined) data.alunoId = body.alunoId;
    if (body.tipo === "integral") data.percentual = 100;
    const bolsa = await prisma.bolsa.update({ where: { id: parseInt(id) }, data });
    await logAudit({
      acao: "bolsa:update",
      recurso: "Bolsa",
      recursoId: bolsa.id,
      antes: antes ? bolsaDTO(antes) : null,
      depois: bolsaDTO(bolsa),
    });
    return NextResponse.json(bolsaDTO(bolsa));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Bolsa não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar bolsa" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.bolsa.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "bolsa:delete", recurso: "Bolsa", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar bolsa" }, { status: 500 });
  }
}
