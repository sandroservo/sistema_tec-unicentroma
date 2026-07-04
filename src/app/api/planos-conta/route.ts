import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("despesa:ler");
    if (guard instanceof NextResponse) return guard;

    const tipo = new URL(req.url).searchParams.get("tipo") ?? undefined;
    const where: Record<string, unknown> = {};
    if (tipo) where.tipo = tipo;

    const data = await prisma.planoConta.findMany({ where, orderBy: { nome: "asc" } });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar planos de conta" }, { status: 500 });
  }
}

const createSchema = z.object({
  codigo: z.string().optional(),
  nome: z.string().min(1),
  tipo: z.enum(["receita", "despesa"]),
  ativo: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("despesa:criar");
    if (guard instanceof NextResponse) return guard;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    const plano = await prisma.planoConta.create({
      data: { codigo: b.codigo ?? null, nome: b.nome, tipo: b.tipo, ativo: b.ativo },
    });
    await logAudit({ acao: "planoConta:create", recurso: "PlanoConta", recursoId: plano.id, depois: plano });
    return NextResponse.json(plano, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar plano de conta" }, { status: 500 });
  }
}
