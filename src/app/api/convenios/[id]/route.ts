import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

type Row = Record<string, any>;
const convenioDTO = (c: Row) => ({ ...c, percentualDesconto: Number(c.percentualDesconto) });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const convenio = await prisma.convenio.findUnique({ where: { id: parseInt(id) } });
    if (!convenio) return NextResponse.json({ error: "Convênio não encontrado" }, { status: 404 });
    return NextResponse.json(convenioDTO(convenio));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar convênio" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const antes = await prisma.convenio.findUnique({ where: { id: parseInt(id) } });
    const body = await req.json();
    const convenio = await prisma.convenio.update({ where: { id: parseInt(id) }, data: { ...body } });
    await logAudit({
      acao: "convenio:update",
      recurso: "Convenio",
      recursoId: convenio.id,
      antes: antes ? convenioDTO(antes) : null,
      depois: convenioDTO(convenio),
    });
    return NextResponse.json(convenioDTO(convenio));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Convênio não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar convênio" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.convenio.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "convenio:delete", recurso: "Convenio", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar convênio" }, { status: 500 });
  }
}
