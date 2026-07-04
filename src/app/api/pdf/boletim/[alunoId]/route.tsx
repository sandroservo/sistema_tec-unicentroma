import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { canAccessAluno } from "@/lib/portal";
import { BoletimDoc, type BoletimLinha } from "@/lib/pdf/boletim";
import { calcularMedia, situacao } from "@/lib/pdf/media";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId: raw } = await params;
  const alunoId = parseInt(raw);
  // Admin (aluno:ler), o próprio aluno ou responsável vinculado.
  if (!(await canAccessAluno(alunoId))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const turmaIdParam = new URL(req.url).searchParams.get("turmaId");

  const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  // Turma: da query, ou a matrícula ativa mais recente.
  let turmaId = turmaIdParam ? parseInt(turmaIdParam) : null;
  if (!turmaId) {
    const mat = await prisma.matricula.findFirst({
      where: { alunoId },
      orderBy: [{ status: "asc" }, { dataMatricula: "desc" }],
    });
    turmaId = mat?.turmaId ?? null;
  }

  const turma = turmaId
    ? await prisma.turma.findUnique({ where: { id: turmaId }, include: { curso: true } })
    : null;

  let linhas: BoletimLinha[] = [];
  if (turma) {
    const disciplinas = await prisma.disciplina.findMany({
      where: { cursoId: turma.cursoId },
      orderBy: { periodo: "asc" },
    });
    linhas = await Promise.all(
      disciplinas.map(async (d) => {
        const avaliacoes = await prisma.avaliacao.findMany({
          where: { turmaId: turma.id, disciplinaId: d.id },
          select: { peso: true, lancamentos: { where: { alunoId }, select: { valor: true } } },
        });
        const media = calcularMedia(avaliacoes);
        return { disciplina: d.nome, media, situacao: situacao(media) };
      })
    );
  }

  const buffer = await renderToBuffer(
    <BoletimDoc
      aluno={aluno.nome}
      curso={turma?.curso.nome ?? "—"}
      turma={turma?.nome ?? "—"}
      linhas={linhas}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="boletim.pdf"`,
    },
  });
}
