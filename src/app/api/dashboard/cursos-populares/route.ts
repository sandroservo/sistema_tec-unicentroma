import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

export async function GET() {
  try {
    const guard = await requirePermission("dashboard:ler");
    if (guard instanceof NextResponse) return guard;

    const rows = await prisma.$queryRaw<
      Array<{ cursoId: number; nome: string; modalidade: string; totalMatriculas: bigint }>
    >`
      SELECT
        c.id as "cursoId",
        c.nome,
        c.modalidade,
        COUNT(m.id) as "totalMatriculas"
      FROM cursos c
      LEFT JOIN turmas t ON t.curso_id = c.id
      LEFT JOIN matriculas m ON m.turma_id = t.id
      GROUP BY c.id, c.nome, c.modalidade
      ORDER BY "totalMatriculas" DESC
      LIMIT 8
    `;
    return NextResponse.json(
      rows.map((r) => ({
        cursoId: r.cursoId,
        nome: r.nome,
        modalidade: r.modalidade,
        totalMatriculas: Number(r.totalMatriculas),
      })),
    );
  } catch {
    return NextResponse.json({ error: "Erro ao buscar cursos populares" }, { status: 500 });
  }
}
