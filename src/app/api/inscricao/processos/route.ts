import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/lib/serialize";

// Público: só processos abertos e dentro do período de inscrição. Nunca expõe inscritos.
export async function GET() {
  try {
    const hoje = new Date();
    const processos = await prisma.processoSeletivo.findMany({
      where: {
        status: "aberto",
        inscricaoInicio: { lte: hoje },
        inscricaoFim: { gte: hoje },
      },
      orderBy: { inscricaoFim: "asc" },
      select: { id: true, nome: true, descricao: true, vagas: true, inscricaoFim: true, taxaInscricao: true },
    });
    return NextResponse.json({
      data: processos.map((p) => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        vagas: p.vagas,
        inscricaoFim: dateOnly(p.inscricaoFim),
        taxaInscricao: Number(p.taxaInscricao),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar processos" }, { status: 500 });
  }
}
