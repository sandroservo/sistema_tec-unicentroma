import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/lib/serialize";
import { requireAluno } from "@/lib/portal";

export async function GET() {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;

  const rows = await prisma.ocorrencia.findMany({
    where: { alunoId: guard.alunoId },
    orderBy: { data: "desc" },
    select: { tipo: true, gravidade: true, descricao: true, data: true },
  });

  return NextResponse.json(rows.map((o) => ({ ...o, data: dateOnly(o.data) })));
}
