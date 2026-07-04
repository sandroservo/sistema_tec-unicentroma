import { NextResponse } from "next/server";
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.bolsa.findUnique({ where: { id: parseInt(id) } });
    const body = await req.json();
    const data: Record<string, unknown> = { ...body };
    if ("dataInicio" in data) data.dataInicio = toDate(body.dataInicio);
    if ("dataFim" in data) data.dataFim = toDate(body.dataFim);
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
