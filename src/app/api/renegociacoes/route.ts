import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { toDate, dateOnly } from "@/lib/serialize";
import { gerarParcelas } from "@/lib/financeiro";

export async function GET() {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const renegs = await prisma.renegociacao.findMany({ orderBy: { criadoEm: "desc" } });
    const alunoIds = [...new Set(renegs.map((r) => r.alunoId))];
    const alunos = await prisma.aluno.findMany({
      where: { id: { in: alunoIds } },
      select: { id: true, nome: true },
    });
    const nomes = new Map(alunos.map((a) => [a.id, a.nome]));

    return NextResponse.json(
      renegs.map((r) => ({
        id: r.id,
        alunoId: r.alunoId,
        alunoNome: nomes.get(r.alunoId) ?? null,
        contratoOrigemId: r.contratoOrigemId,
        novoContratoId: r.novoContratoId,
        valorTotal: Number(r.valorTotal),
        numParcelas: r.numParcelas,
        motivo: r.motivo,
        criadoEm: dateOnly(r.criadoEm),
      })),
    );
  } catch {
    return NextResponse.json({ error: "Erro ao listar renegociações" }, { status: 500 });
  }
}

const bodySchema = z.object({
  alunoId: z.number().int(),
  parcelaIds: z.array(z.number().int()).min(1),
  numParcelas: z.number().int().min(1),
  diaVencimento: z.number().int().min(1).max(31).default(10),
  dataInicio: z.string(),
  motivo: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const { alunoId, parcelaIds, numParcelas, diaVencimento, motivo } = parsed.data;
    const dataInicio = toDate(parsed.data.dataInicio)!;

    const result = await prisma.$transaction(async (tx) => {
      // (1) parcelas devem pertencer a contratos do aluno e não estar pagas.
      const parcelas = await tx.parcela.findMany({
        where: { id: { in: parcelaIds }, contrato: { alunoId } },
        select: { id: true, valor: true, status: true, contratoId: true },
      });
      if (parcelas.length !== parcelaIds.length) {
        throw new Error("Parcelas inválidas ou não pertencem ao aluno");
      }
      if (parcelas.some((p) => p.status === "pago")) {
        throw new Error("Não é possível renegociar parcelas já pagas");
      }

      // (2) valorTotal = soma dos valores.
      const valorTotal = Math.round(parcelas.reduce((s, p) => s + Number(p.valor), 0) * 100) / 100;

      // (3) marca as parcelas de origem como renegociada.
      await tx.parcela.updateMany({
        where: { id: { in: parcelaIds } },
        data: { status: "renegociada" },
      });

      // (4) novo contrato.
      const novoContrato = await tx.contrato.create({
        data: {
          alunoId,
          valorTotal,
          numParcelas,
          diaVencimento,
          dataInicio,
          status: "ativo",
          observacoes: "Renegociação",
        },
      });

      // (5) parcelas do novo contrato via helper (fonte única).
      const novas = gerarParcelas({ valorTotal, numParcelas, diaVencimento, dataInicio });
      await tx.parcela.createMany({
        data: novas.map((p) => ({
          contratoId: novoContrato.id,
          numero: p.numero,
          valor: p.valor,
          vencimento: p.vencimento,
        })),
      });

      // (6) registro de renegociação.
      await tx.renegociacao.create({
        data: {
          alunoId,
          contratoOrigemId: parcelas[0].contratoId,
          novoContratoId: novoContrato.id,
          valorTotal,
          numParcelas,
          motivo: motivo ?? null,
        },
      });

      return novoContrato.id;
    });

    await logAudit({ acao: "renegociacao:create", recurso: "Renegociacao", recursoId: result });
    return NextResponse.json({ ok: true, novoContratoId: result }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao renegociar";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
