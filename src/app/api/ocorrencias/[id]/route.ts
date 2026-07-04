import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  tipo: z.enum(["advertencia", "elogio", "observacao", "suspensao"]).optional(),
  gravidade: z.enum(["baixa", "media", "alta"]).optional(),
  descricao: z.string().min(1).optional(),
  data: z.string().min(1).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ocorrencia:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const o = await prisma.ocorrencia.findUnique({
      where: { id: parseInt(id) },
      include: { aluno: { select: { nome: true } } },
    });
    if (!o) return NextResponse.json({ error: "Ocorrência não encontrada" }, { status: 404 });
    return NextResponse.json({ ...o, alunoNome: o.aluno.nome, data: dateOnly(o.data) });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar ocorrência" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ocorrencia:registrar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { data: dataStr, ...rest } = parsed.data;
    const o = await prisma.ocorrencia.update({
      where: { id: parseInt(id) },
      data: { ...rest, ...(dataStr ? { data: toDate(dataStr)! } : {}) },
    });
    await logAudit({ acao: "ocorrencia:update", recurso: "Ocorrencia", recursoId: o.id, depois: o });
    return NextResponse.json({ ...o, data: dateOnly(o.data) });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Ocorrência não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar ocorrência" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ocorrencia:registrar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.ocorrencia.findUnique({ where: { id: parseInt(id) } });
    if (!antes) return NextResponse.json({ error: "Ocorrência não encontrada" }, { status: 404 });
    await prisma.ocorrencia.delete({ where: { id: parseInt(id) } });
    await logAudit({ acao: "ocorrencia:delete", recurso: "Ocorrencia", recursoId: id, antes });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir ocorrência" }, { status: 500 });
  }
}
