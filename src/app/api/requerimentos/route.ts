import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

export async function GET(req: Request) {
  const guard = await requirePermission("requerimento:ler");
  if (guard instanceof NextResponse) return guard;

  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") ?? undefined;
  const alunoId = sp.get("alunoId") ?? undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (alunoId) where.alunoId = Number(alunoId);

  const rows = await prisma.requerimento.findMany({
    where,
    include: { aluno: { select: { nome: true } } },
    orderBy: { criadoEm: "desc" },
  });

  const data = rows.map(({ aluno, ...r }) => ({ ...r, alunoNome: aluno?.nome ?? null }));
  return NextResponse.json(data);
}
