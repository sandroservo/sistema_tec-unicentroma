import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { dateOnly, toDate } from "@/lib/serialize";

const TIPOS = [
  "feriado", "prova", "recesso", "evento",
  "conselho", "formatura", "inicio_semestre", "fim_semestre",
] as const;

const eventoSchema = z.object({
  titulo: z.string().min(1),
  tipo: z.enum(TIPOS),
  dataInicio: z.string().min(1),
  dataFim: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
});

const eventoDTO = (e: Record<string, any>) => ({
  ...e,
  dataInicio: dateOnly(e.dataInicio),
  dataFim: dateOnly(e.dataFim),
});

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("calendario:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const tipo = sp.get("tipo") ?? undefined;
    const ano = sp.get("ano") ?? undefined;

    const where: Record<string, unknown> = {};
    if (tipo) where.tipo = tipo;
    if (ano) {
      const y = parseInt(ano);
      if (!Number.isNaN(y))
        where.dataInicio = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
    }

    const data = await prisma.calendarioEvento.findMany({ where, orderBy: { dataInicio: "asc" } });
    return NextResponse.json(data.map(eventoDTO));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar eventos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("calendario:criar");
    if (guard instanceof NextResponse) return guard;

    const parsed = eventoSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const evento = await prisma.calendarioEvento.create({
      data: {
        titulo: parsed.data.titulo,
        tipo: parsed.data.tipo,
        dataInicio: toDate(parsed.data.dataInicio)!,
        dataFim: toDate(parsed.data.dataFim),
        descricao: parsed.data.descricao ?? null,
      },
    });
    await logAudit({ acao: "calendario:create", recurso: "CalendarioEvento", recursoId: evento.id, depois: eventoDTO(evento) });
    return NextResponse.json(eventoDTO(evento), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar evento" }, { status: 500 });
  }
}
