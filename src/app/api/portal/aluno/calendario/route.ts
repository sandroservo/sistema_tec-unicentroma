import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";
import { dateOnly } from "@/lib/serialize";

export async function GET() {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const eventos = await prisma.calendarioEvento.findMany({
    where: { dataInicio: { gte: hoje } },
    orderBy: { dataInicio: "asc" },
  });

  return NextResponse.json(
    eventos.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      tipo: e.tipo,
      dataInicio: dateOnly(e.dataInicio),
      dataFim: dateOnly(e.dataFim),
      descricao: e.descricao,
    })),
  );
}
