import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireResponsavel } from "@/lib/portal";

export async function GET() {
  const guard = await requireResponsavel();
  if (guard instanceof NextResponse) return guard;

  const resp = await prisma.responsavel.findUnique({
    where: { id: guard.responsavelId },
    select: { id: true, nome: true, alunos: { select: { id: true, nome: true }, orderBy: { nome: "asc" } } },
  });
  if (!resp) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ responsavelId: resp.id, nome: resp.nome, alunos: resp.alunos });
}
