import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

export async function GET(req: Request) {
  const guard = await requirePermission("matricula:ler");
  if (guard instanceof NextResponse) return guard;

  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") ?? undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const rows = await prisma.rematricula.findMany({
    where,
    include: {
      aluno: { select: { nome: true } },
      turmaDestino: { include: { curso: { select: { nome: true } } } },
    },
    orderBy: { criadoEm: "desc" },
  });

  const data = rows.map((r) => ({
    id: r.id,
    alunoNome: r.aluno?.nome ?? null,
    turmaDestinoNome: r.turmaDestino.nome,
    cursoNome: r.turmaDestino.curso.nome,
    periodoLetivo: r.periodoLetivo,
    status: r.status,
    observacao: r.observacao,
    criadoEm: r.criadoEm,
  }));
  return NextResponse.json(data);
}
