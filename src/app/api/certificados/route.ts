import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { certificadoDTO } from "@/lib/dto";
import { toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { randomBytes } from "crypto";

function generateCodigo(): string {
  return `CERT-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("certificado:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const alunoId = sp.get("alunoId");
    const where: Record<string, unknown> = {};
    if (alunoId) where.alunoId = parseInt(alunoId);

    const data = await prisma.certificado.findMany({
      where,
      orderBy: { dataEmissao: "asc" },
      include: { aluno: { select: { nome: true } }, curso: { select: { nome: true } } },
    });
    return NextResponse.json(
      data.map((c) =>
        certificadoDTO({
          id: c.id,
          alunoId: c.alunoId,
          alunoNome: c.aluno?.nome ?? null,
          cursoId: c.cursoId,
          cursoNome: c.curso?.nome ?? null,
          turmaId: c.turmaId,
          matriculaId: c.matriculaId,
          dataEmissao: c.dataEmissao,
          cargaHoraria: c.cargaHoraria,
          codigo: c.codigo,
          criadoEm: c.criadoEm,
        }),
      ),
    );
  } catch {
    return NextResponse.json({ error: "Erro ao buscar certificados" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("certificado:criar");
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const codigo = generateCodigo();
    const certificado = await prisma.certificado.create({
      data: {
        alunoId: body.alunoId,
        cursoId: body.cursoId,
        turmaId: body.turmaId ?? null,
        matriculaId: body.matriculaId ?? null,
        dataEmissao: toDate(body.dataEmissao)!,
        cargaHoraria: body.cargaHoraria,
        codigo,
      },
    });

    const aluno = await prisma.aluno.findUnique({ where: { id: body.alunoId } });
    const curso = await prisma.curso.findUnique({ where: { id: body.cursoId } });
    await prisma.atividade.create({
      data: {
        tipo: "certificado",
        descricao: `Certificado emitido: ${aluno?.nome ?? "Aluno"} - ${curso?.nome ?? "Curso"}`,
      },
    });

    await logAudit({ acao: "certificado:create", recurso: "Certificado", recursoId: certificado.id, depois: certificadoDTO(certificado) });
    return NextResponse.json(certificadoDTO(certificado), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar certificado" }, { status: 500 });
  }
}
