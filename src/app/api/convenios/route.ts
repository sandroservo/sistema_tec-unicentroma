import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

type Row = Record<string, any>;
const convenioDTO = (c: Row) => ({ ...c, percentualDesconto: Number(c.percentualDesconto) });

const convenioSchema = z.object({
  nome: z.string().min(1),
  empresa: z.string().optional(),
  percentualDesconto: z.number().min(0).max(100),
  ativo: z.boolean().default(true),
});

export async function GET() {
  try {
    const guard = await requirePermission("cobranca:ler");
    if (guard instanceof NextResponse) return guard;
    const data = await prisma.convenio.findMany({ orderBy: { nome: "asc" } });
    return NextResponse.json({ data: data.map(convenioDTO) });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar convênios" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("cobranca:criar");
    if (guard instanceof NextResponse) return guard;

    const parsed = convenioSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
    const body = parsed.data;

    const convenio = await prisma.convenio.create({
      data: {
        nome: body.nome,
        empresa: body.empresa ?? null,
        percentualDesconto: body.percentualDesconto,
        ativo: body.ativo,
      },
    });
    await logAudit({ acao: "convenio:create", recurso: "Convenio", recursoId: convenio.id, depois: convenioDTO(convenio) });
    return NextResponse.json(convenioDTO(convenio), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar convênio" }, { status: 500 });
  }
}
