import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { gerarParcelas, descontoEfetivo } from "@/lib/financeiro";

function contratoDTO(c: any) {
  const parcelas = c.parcelas ?? [];
  const pagas = parcelas.filter((p: any) => p.status === "pago").length;
  const pendentes = parcelas.filter((p: any) => p.status === "pendente").length;
  return {
    id: c.id,
    alunoId: c.alunoId,
    alunoNome: c.aluno?.nome ?? null,
    cursoId: c.cursoId,
    turmaId: c.turmaId,
    valorTotal: Number(c.valorTotal),
    numParcelas: c.numParcelas,
    diaVencimento: c.diaVencimento,
    dataInicio: dateOnly(c.dataInicio),
    descontoPercentual: Number(c.descontoPercentual),
    bolsaId: c.bolsaId,
    convenioId: c.convenioId,
    status: c.status,
    observacoes: c.observacoes,
    criadoEm: c.criadoEm,
    resumoParcelas: { total: parcelas.length, pagas, pendentes },
  };
}

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const alunoId = sp.get("alunoId");
    const status = sp.get("status") ?? undefined;

    const where: Record<string, unknown> = {};
    if (alunoId) where.alunoId = parseInt(alunoId);
    if (status) where.status = status;

    const data = await prisma.contrato.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      include: { aluno: { select: { nome: true } }, parcelas: { select: { status: true } } },
    });
    return NextResponse.json(data.map(contratoDTO));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar contratos" }, { status: 500 });
  }
}

const createSchema = z.object({
  alunoId: z.number().int(),
  cursoId: z.number().int().optional(),
  turmaId: z.number().int().optional(),
  valorTotal: z.number().positive(),
  numParcelas: z.number().int().positive(),
  diaVencimento: z.number().int().min(1).max(31).default(10),
  dataInicio: z.string(),
  bolsaId: z.number().int().optional(),
  convenioId: z.number().int().optional(),
  observacoes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("cobranca:criar");
    if (guard instanceof NextResponse) return guard;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    let descontoPercentual = 0;
    if (b.bolsaId || b.convenioId) {
      const [bolsa, convenio] = await Promise.all([
        b.bolsaId ? prisma.bolsa.findUnique({ where: { id: b.bolsaId } }) : null,
        b.convenioId ? prisma.convenio.findUnique({ where: { id: b.convenioId } }) : null,
      ]);
      descontoPercentual = descontoEfetivo(
        bolsa ? Number(bolsa.percentual) : null,
        convenio ? Number(convenio.percentualDesconto) : null,
      );
    }

    const dataInicio = toDate(b.dataInicio)!;
    const parcelas = gerarParcelas({
      valorTotal: b.valorTotal,
      numParcelas: b.numParcelas,
      diaVencimento: b.diaVencimento,
      dataInicio,
      descontoPercentual,
    });

    const contrato = await prisma.$transaction(async (tx) => {
      const c = await tx.contrato.create({
        data: {
          alunoId: b.alunoId,
          cursoId: b.cursoId ?? null,
          turmaId: b.turmaId ?? null,
          valorTotal: String(b.valorTotal),
          numParcelas: b.numParcelas,
          diaVencimento: b.diaVencimento,
          dataInicio,
          descontoPercentual: String(descontoPercentual),
          bolsaId: b.bolsaId ?? null,
          convenioId: b.convenioId ?? null,
          observacoes: b.observacoes ?? null,
        },
      });
      await tx.parcela.createMany({
        data: parcelas.map((p) => ({
          contratoId: c.id,
          numero: p.numero,
          valor: String(p.valor),
          vencimento: toDate(p.vencimento.toISOString())!,
        })),
      });
      return tx.contrato.findUnique({
        where: { id: c.id },
        include: { aluno: { select: { nome: true } }, parcelas: true },
      });
    });

    await logAudit({ acao: "contrato:create", recurso: "Contrato", recursoId: contrato!.id, depois: contratoDTO(contrato) });
    return NextResponse.json(contratoDTO(contrato), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar contrato" }, { status: 500 });
  }
}
