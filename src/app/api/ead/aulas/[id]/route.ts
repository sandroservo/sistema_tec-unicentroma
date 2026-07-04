import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ead:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const aula = await prisma.aulaEad.findUnique({ where: { id: parseInt(id) } });
    if (!aula) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    return NextResponse.json(aula);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar aula" }, { status: 500 });
  }
}

const patchSchema = z.object({
  titulo: z.string().min(1).optional(),
  tipo: z.enum(["video", "pdf", "texto", "link"]).optional(),
  url: z.string().nullable().optional(),
  conteudo: z.string().nullable().optional(),
  ordem: z.number().int().optional(),
  duracaoMin: z.number().int().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ead:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const aula = await prisma.aulaEad.update({ where: { id: parseInt(id) }, data: parsed.data });
    await logAudit({ acao: "ead:aula:update", recurso: "AulaEad", recursoId: aula.id, depois: aula });
    return NextResponse.json(aula);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar aula" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("ead:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.aulaEad.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "ead:aula:delete", recurso: "AulaEad", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar aula" }, { status: 500 });
  }
}
