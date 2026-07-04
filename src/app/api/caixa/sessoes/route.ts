import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { num } from "@/lib/serialize";
import { totaisPorMetodo } from "./totais";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const status = sp.get("status");
    const de = sp.get("de");
    const ate = sp.get("ate");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (de || ate) {
      const abertoEm: Record<string, Date> = {};
      if (de) abertoEm.gte = new Date(`${de}T00:00:00`);
      if (ate) {
        const fim = new Date(`${ate}T00:00:00`);
        fim.setDate(fim.getDate() + 1);
        abertoEm.lt = fim;
      }
      where.abertoEm = abertoEm;
    }

    const sessoes = await prisma.caixaSessao.findMany({
      where,
      orderBy: { abertoEm: "desc" },
      take: 60,
      include: { recebimentos: { select: { metodo: true, valor: true } } },
    });

    const userIds = [
      ...new Set(sessoes.flatMap((s) => [s.abertoPorUserId, s.fechadoPorUserId]).filter((id): id is string => !!id)),
    ];
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nome: true } });
    const nome = (id: string | null) => users.find((u) => u.id === id)?.nome ?? null;

    return NextResponse.json(
      sessoes.map((s) => {
        const totais = totaisPorMetodo(s.recebimentos);
        const esperadoDinheiro = Math.round((num(s.valorAbertura) + totais.dinheiro) * 100) / 100;
        const valorFechamento = s.valorFechamento !== null ? num(s.valorFechamento) : null;
        return {
          id: s.id,
          status: s.status,
          abertoEm: s.abertoEm.toISOString(),
          fechadoEm: s.fechadoEm?.toISOString() ?? null,
          abertoPorNome: nome(s.abertoPorUserId),
          fechadoPorNome: nome(s.fechadoPorUserId),
          valorAbertura: num(s.valorAbertura),
          valorFechamento,
          totais,
          esperadoDinheiro,
          diferenca: valorFechamento !== null ? Math.round((valorFechamento - esperadoDinheiro) * 100) / 100 : null,
        };
      })
    );
  } catch {
    return NextResponse.json({ error: "Erro ao listar sessões de caixa" }, { status: 500 });
  }
}

const postSchema = z.object({
  valorAbertura: z.number().min(0),
  observacoes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("cobranca:editar");
    if (guard instanceof NextResponse) return guard;
    const { user } = guard;

    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
    }

    const aberta = await prisma.caixaSessao.findFirst({ where: { status: "aberto" } });
    if (aberta) return NextResponse.json({ error: "Já existe um caixa aberto" }, { status: 409 });

    const sessao = await prisma.caixaSessao.create({
      data: {
        valorAbertura: parsed.data.valorAbertura,
        observacoes: parsed.data.observacoes ?? null,
        abertoPorUserId: user.id ?? null,
      },
    });

    await logAudit({
      acao: "caixa:abrir",
      recurso: "CaixaSessao",
      recursoId: sessao.id,
      depois: { id: sessao.id, valorAbertura: parsed.data.valorAbertura },
    });

    return NextResponse.json(
      { id: sessao.id, status: sessao.status, valorAbertura: num(sessao.valorAbertura), abertoEm: sessao.abertoEm.toISOString() },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Erro ao abrir caixa" }, { status: 500 });
  }
}
