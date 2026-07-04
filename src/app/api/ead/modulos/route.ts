import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("ead:ler");
    if (guard instanceof NextResponse) return guard;

    const cursoId = new URL(req.url).searchParams.get("cursoId");
    const where = cursoId ? { cursoId: parseInt(cursoId) } : {};
    const modulos = await prisma.moduloEad.findMany({
      where,
      orderBy: { ordem: "asc" },
      include: { _count: { select: { aulas: true } } },
    });
    return NextResponse.json(
      modulos.map((m) => ({
        id: m.id,
        cursoId: m.cursoId,
        titulo: m.titulo,
        descricao: m.descricao,
        ordem: m.ordem,
        totalAulas: m._count.aulas,
      })),
    );
  } catch {
    return NextResponse.json({ error: "Erro ao buscar módulos" }, { status: 500 });
  }
}

const createSchema = z.object({
  cursoId: z.number().int(),
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  ordem: z.number().int().optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("ead:criar");
    if (guard instanceof NextResponse) return guard;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const modulo = await prisma.moduloEad.create({
      data: {
        cursoId: parsed.data.cursoId,
        titulo: parsed.data.titulo,
        descricao: parsed.data.descricao ?? null,
        ordem: parsed.data.ordem ?? 0,
      },
    });
    await logAudit({ acao: "ead:modulo:create", recurso: "ModuloEad", recursoId: modulo.id, depois: modulo });
    return NextResponse.json(modulo, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar módulo" }, { status: 500 });
  }
}
