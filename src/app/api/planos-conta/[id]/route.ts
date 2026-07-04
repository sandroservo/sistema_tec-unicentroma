import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("despesa:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const plano = await prisma.planoConta.findUnique({ where: { id: parseInt(id) } });
    if (!plano) return NextResponse.json({ error: "Plano de conta não encontrado" }, { status: 404 });
    return NextResponse.json(plano);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar plano de conta" }, { status: 500 });
  }
}

const patchSchema = z.object({
  codigo: z.string().nullish(),
  nome: z.string().min(1).optional(),
  tipo: z.enum(["receita", "despesa"]).optional(),
  ativo: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("despesa:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const plano = await prisma.planoConta.update({ where: { id: parseInt(id) }, data: parsed.data });
    await logAudit({ acao: "planoConta:update", recurso: "PlanoConta", recursoId: plano.id, depois: plano });
    return NextResponse.json(plano);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Plano de conta não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar plano de conta" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("despesa:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.planoConta.delete({ where: { id: parseInt(id) } });
    await logAudit({ acao: "planoConta:delete", recurso: "PlanoConta", recursoId: parseInt(id) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Plano de conta não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao excluir plano de conta" }, { status: 500 });
  }
}
