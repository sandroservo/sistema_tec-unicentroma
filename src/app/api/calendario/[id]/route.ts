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

const patchSchema = z.object({
  titulo: z.string().min(1).optional(),
  tipo: z.enum(TIPOS).optional(),
  dataInicio: z.string().min(1).optional(),
  dataFim: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
});

const eventoDTO = (e: Record<string, any>) => ({
  ...e,
  dataInicio: dateOnly(e.dataInicio),
  dataFim: dateOnly(e.dataFim),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("calendario:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const evento = await prisma.calendarioEvento.findUnique({ where: { id: parseInt(id) } });
    if (!evento) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    return NextResponse.json(eventoDTO(evento));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar evento" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("calendario:editar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const data: Record<string, unknown> = { ...parsed.data };
    if ("dataInicio" in data) data.dataInicio = toDate(data.dataInicio as string);
    if ("dataFim" in data) data.dataFim = toDate(data.dataFim as string | null);

    const antes = await prisma.calendarioEvento.findUnique({ where: { id: parseInt(id) } });
    const evento = await prisma.calendarioEvento.update({ where: { id: parseInt(id) }, data });
    await logAudit({
      acao: "calendario:update",
      recurso: "CalendarioEvento",
      recursoId: evento.id,
      antes: antes ? eventoDTO(antes) : null,
      depois: eventoDTO(evento),
    });
    return NextResponse.json(eventoDTO(evento));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar evento" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("calendario:excluir");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.calendarioEvento.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "calendario:delete", recurso: "CalendarioEvento", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar evento" }, { status: 500 });
  }
}
