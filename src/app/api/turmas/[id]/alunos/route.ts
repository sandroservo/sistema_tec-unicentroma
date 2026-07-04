import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { alunoDTO } from "@/lib/dto";
import { requirePermission } from "@/lib/authz";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("turma:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const matriculas = await prisma.matricula.findMany({
      where: { turmaId: parseInt(id), status: "ativa" },
      include: { aluno: true },
    });
    return NextResponse.json(matriculas.map((m) => alunoDTO(m.aluno)));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar alunos da turma" }, { status: 500 });
  }
}
