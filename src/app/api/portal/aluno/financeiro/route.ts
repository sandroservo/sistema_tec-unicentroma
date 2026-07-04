import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";
import { dateOnly, num } from "@/lib/serialize";

export async function GET() {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;

  const cobrancas = await prisma.cobranca.findMany({
    where: { alunoId: guard.alunoId },
    orderBy: { vencimento: "desc" },
  });

  return NextResponse.json(
    cobrancas.map((c) => ({
      id: c.id,
      descricao: c.descricao,
      valor: num(c.valor),
      vencimento: dateOnly(c.vencimento),
      dataPagamento: dateOnly(c.dataPagamento),
      status: c.status,
    })),
  );
}
