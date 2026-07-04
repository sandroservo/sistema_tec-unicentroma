import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const planoSchema = z.object({
  ementa: z.string().optional(),
  conteudoProgramatico: z.string().optional(),
  competencias: z.string().optional(),
  metodologia: z.string().optional(),
  bibliografia: z.string().optional(),
  criterioAvaliacao: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("planoensino:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const plano = await prisma.planoEnsino.findUnique({ where: { disciplinaId: parseInt(id) } });
    return NextResponse.json(plano);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar plano de ensino" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("planoensino:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const disciplinaId = parseInt(id);

    const parsed = planoSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const plano = await prisma.planoEnsino.upsert({
      where: { disciplinaId },
      create: { disciplinaId, ...parsed.data },
      update: parsed.data,
    });
    await logAudit({ acao: "planoensino:update", recurso: "PlanoEnsino", recursoId: plano.id, depois: plano });
    return NextResponse.json(plano);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2003")
      return NextResponse.json({ error: "Disciplina não encontrada" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao salvar plano de ensino" }, { status: 500 });
  }
}
