import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

const inscricaoDTO = (i: Record<string, any>) => ({ ...i, nota: i.nota == null ? null : Number(i.nota) });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("selecao:ler");
    if (guard instanceof NextResponse) return guard;

    const processoId = Number((await params).id);
    const inscricoes = await prisma.inscricao.findMany({
      where: { processoId },
      orderBy: [{ classificacao: "asc" }, { nome: "asc" }],
    });
    return NextResponse.json({ data: inscricoes.map(inscricaoDTO) });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar inscrições" }, { status: 500 });
  }
}
