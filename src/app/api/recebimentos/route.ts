import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { num } from "@/lib/serialize";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const alunoId = sp.get("alunoId");
    const data = sp.get("data"); // YYYY-MM-DD → recebimentos do dia

    const where: Record<string, unknown> = {};
    if (alunoId) where.alunoId = parseInt(alunoId);
    if (data) {
      const inicio = new Date(`${data}T00:00:00`);
      const fim = new Date(inicio);
      fim.setDate(fim.getDate() + 1);
      where.criadoEm = { gte: inicio, lt: fim };
    }

    const recebimentos = await prisma.recebimento.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      take: 100,
      include: { aluno: { select: { nome: true } }, _count: { select: { itens: true } } },
    });

    return NextResponse.json(
      recebimentos.map((r) => ({
        id: r.id,
        alunoId: r.alunoId,
        alunoNome: r.aluno.nome,
        valor: num(r.valor),
        metodo: r.metodo,
        valorRecebido: r.valorRecebido ? num(r.valorRecebido) : null,
        itens: r._count.itens,
        criadoEm: r.criadoEm.toISOString(),
      }))
    );
  } catch {
    return NextResponse.json({ error: "Erro ao listar recebimentos" }, { status: 500 });
  }
}

const postSchema = z.object({
  alunoId: z.number().int(),
  metodo: z.enum(["dinheiro", "pix", "cartao_debito", "cartao_credito"]),
  valorRecebido: z.number().positive().optional(),
  observacoes: z.string().optional(),
  itens: z
    .array(z.object({ tipo: z.enum(["cobranca", "parcela"]), id: z.number().int() }))
    .min(1),
});

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;
    const { user } = guard;

    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    const hoje = new Date();

    const sessaoAberta = await prisma.caixaSessao.findFirst({ where: { status: "aberto" }, select: { id: true } });
    if (!sessaoAberta) {
      return NextResponse.json({ error: "Abra o caixa antes de registrar recebimentos" }, { status: 409 });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // Revalida cada item no servidor — nunca confiar no total do client.
      const itensValidados: { cobrancaId?: number; parcelaId?: number; descricao: string; valor: number }[] = [];

      for (const item of b.itens) {
        if (item.tipo === "cobranca") {
          const c = await tx.cobranca.findUnique({ where: { id: item.id } });
          if (!c || c.alunoId !== b.alunoId || !["pendente", "vencido"].includes(c.status)) {
            throw new HttpError(409, "Item já pago ou inválido");
          }
          itensValidados.push({ cobrancaId: c.id, descricao: c.descricao, valor: num(c.valor) });
        } else {
          const p = await tx.parcela.findUnique({ where: { id: item.id }, include: { contrato: true } });
          if (!p || p.contrato.alunoId !== b.alunoId || !["pendente", "vencido"].includes(p.status)) {
            throw new HttpError(409, "Item já pago ou inválido");
          }
          itensValidados.push({
            parcelaId: p.id,
            descricao: `Parcela ${p.numero}/${p.contrato.numParcelas} — Contrato #${p.contrato.id}`,
            valor: num(p.valor),
          });
        }
      }

      const total = Math.round(itensValidados.reduce((s, i) => s + i.valor, 0) * 100) / 100;

      if (b.metodo === "dinheiro" && b.valorRecebido !== undefined && b.valorRecebido < total) {
        throw new HttpError(400, "Valor recebido insuficiente");
      }

      const baixa = { status: "pago", dataPagamento: hoje, metodoPagamento: b.metodo };
      for (const i of itensValidados) {
        if (i.cobrancaId) await tx.cobranca.update({ where: { id: i.cobrancaId }, data: baixa });
        else await tx.parcela.update({ where: { id: i.parcelaId! }, data: baixa });
      }

      const rec = await tx.recebimento.create({
        data: {
          alunoId: b.alunoId,
          caixaSessaoId: sessaoAberta.id,
          valor: total,
          metodo: b.metodo,
          valorRecebido: b.metodo === "dinheiro" ? (b.valorRecebido ?? null) : null,
          observacoes: b.observacoes ?? null,
          recebidoPorUserId: user.id ?? null,
          itens: {
            create: itensValidados.map((i) => ({
              cobrancaId: i.cobrancaId ?? null,
              parcelaId: i.parcelaId ?? null,
              descricao: i.descricao,
              valor: i.valor,
            })),
          },
        },
      });

      return { id: rec.id, valor: total };
    });

    await logAudit({
      acao: "recebimento:create",
      recurso: "Recebimento",
      recursoId: resultado.id,
      depois: { id: resultado.id, valor: resultado.valor, metodo: b.metodo, itens: b.itens.length },
    });

    const troco =
      b.metodo === "dinheiro" && b.valorRecebido !== undefined
        ? Math.round((b.valorRecebido - resultado.valor) * 100) / 100
        : 0;

    return NextResponse.json({ id: resultado.id, valor: resultado.valor, troco }, { status: 201 });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Erro ao registrar recebimento" }, { status: 500 });
  }
}
