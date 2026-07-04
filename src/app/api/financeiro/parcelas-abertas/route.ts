import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { dateOnly } from "@/lib/serialize";

// Parcelas não pagas de um aluno (para o fluxo de renegociação).
export async function GET(req: Request) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const alunoId = parseInt(new URL(req.url).searchParams.get("alunoId") ?? "");
    if (!alunoId) return NextResponse.json({ error: "alunoId obrigatório" }, { status: 400 });

    const parcelas = await prisma.parcela.findMany({
      where: {
        status: { in: ["pendente", "vencido"] },
        contrato: { alunoId },
      },
      orderBy: { vencimento: "asc" },
      select: { id: true, numero: true, valor: true, vencimento: true, contratoId: true },
    });

    return NextResponse.json(
      parcelas.map((p) => ({
        id: p.id,
        numero: p.numero,
        valor: Number(p.valor),
        vencimento: dateOnly(p.vencimento),
        contratoId: p.contratoId,
      })),
    );
  } catch {
    return NextResponse.json({ error: "Erro ao buscar parcelas" }, { status: 500 });
  }
}
