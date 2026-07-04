import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/authz";

// Papel do usuário → público-alvo correspondente. Papéis administrativos veem todos.
const PAPEL_PUBLICO: Record<string, string> = {
  aluno: "alunos",
  professor: "professores",
  responsavel: "responsaveis",
};

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const proprio = PAPEL_PUBLICO[user.papel ?? ""];
  // Papéis administrativos (sem mapeamento) veem qualquer público.
  const publicoFiltro = proprio ? { publico: { in: ["todos", proprio] } } : {};

  const avisos = await prisma.aviso.findMany({
    where: {
      ativo: true,
      OR: [{ expiraEm: null }, { expiraEm: { gte: hoje } }],
      ...publicoFiltro,
    },
    orderBy: [{ fixado: "desc" }, { criadoEm: "desc" }],
    take: 20,
    select: { id: true, titulo: true, conteudo: true, publico: true, fixado: true, criadoEm: true },
  });

  return NextResponse.json(
    avisos.map((a) => ({ ...a, criadoEm: a.criadoEm.toISOString() })),
  );
}
