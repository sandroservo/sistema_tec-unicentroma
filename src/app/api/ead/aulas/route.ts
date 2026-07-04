import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("ead:ler");
    if (guard instanceof NextResponse) return guard;

    const moduloId = new URL(req.url).searchParams.get("moduloId");
    const where = moduloId ? { moduloId: parseInt(moduloId) } : {};
    const aulas = await prisma.aulaEad.findMany({ where, orderBy: { ordem: "asc" } });
    return NextResponse.json(aulas);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar aulas" }, { status: 500 });
  }
}

const createSchema = z.object({
  moduloId: z.number().int(),
  titulo: z.string().min(1),
  tipo: z.enum(["video", "pdf", "texto", "link"]),
  url: z.string().optional(),
  conteudo: z.string().optional(),
  ordem: z.number().int().optional(),
  duracaoMin: z.number().int().optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("ead:criar");
    if (guard instanceof NextResponse) return guard;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const aula = await prisma.aulaEad.create({
      data: {
        moduloId: d.moduloId,
        titulo: d.titulo,
        tipo: d.tipo,
        url: d.url ?? null,
        conteudo: d.conteudo ?? null,
        ordem: d.ordem ?? 0,
        duracaoMin: d.duracaoMin ?? null,
      },
    });
    await logAudit({ acao: "ead:aula:create", recurso: "AulaEad", recursoId: aula.id, depois: aula });
    return NextResponse.json(aula, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar aula" }, { status: 500 });
  }
}
