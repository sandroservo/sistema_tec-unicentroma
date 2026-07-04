import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("biblioteca:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const tituloId = sp.get("tituloId");
    const alunoId = sp.get("alunoId");
    const status = sp.get("status") ?? undefined;

    const where: Record<string, unknown> = {};
    if (tituloId) where.tituloId = parseInt(tituloId);
    if (alunoId) where.alunoId = parseInt(alunoId);
    if (status) where.status = status;

    const reservas = await prisma.reserva.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      include: {
        aluno: { select: { nome: true } },
        titulo: { select: { titulo: true } },
      },
    });

    const data = reservas.map((r) => ({
      id: r.id,
      tituloId: r.tituloId,
      alunoId: r.alunoId,
      alunoNome: r.aluno.nome,
      tituloNome: r.titulo.titulo,
      status: r.status,
      criadoEm: dateOnly(r.criadoEm),
    }));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar reservas" }, { status: 500 });
  }
}

const reservaSchema = z.object({
  tituloId: z.number().int(),
  alunoId: z.number().int(),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("biblioteca:emprestar");
    if (guard instanceof NextResponse) return guard;

    const parsed = reservaSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const reserva = await prisma.reserva.create({
      data: { tituloId: parsed.data.tituloId, alunoId: parsed.data.alunoId, status: "ativa" },
    });
    await logAudit({ acao: "reserva:create", recurso: "Reserva", recursoId: reserva.id, depois: reserva });
    return NextResponse.json(reserva, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar reserva" }, { status: 500 });
  }
}
