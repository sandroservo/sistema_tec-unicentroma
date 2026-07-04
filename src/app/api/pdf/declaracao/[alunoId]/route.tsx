import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { DeclaracaoDoc } from "@/lib/pdf/declaracao";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ alunoId: string }> }) {
  const guard = await requirePermission("aluno:ler");
  if (guard instanceof NextResponse) return guard;

  const { alunoId: raw } = await params;
  const alunoId = parseInt(raw);

  const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const mat = await prisma.matricula.findFirst({
    where: { alunoId },
    orderBy: [{ status: "asc" }, { dataMatricula: "desc" }],
    include: { turma: { include: { curso: true } } },
  });

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const buffer = await renderToBuffer(
    <DeclaracaoDoc
      aluno={aluno.nome}
      cpf={aluno.cpf}
      matricula={mat ? String(mat.id) : "—"}
      curso={mat?.turma.curso.nome ?? "—"}
      turma={mat?.turma.nome ?? "—"}
      dataHoje={dataHoje}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="declaracao.pdf"`,
    },
  });
}
