import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import * as z from "zod";

type Proc = Record<string, any>;
const processoDTO = (p: Proc) => ({
  ...p,
  inscricaoInicio: dateOnly(p.inscricaoInicio),
  inscricaoFim: dateOnly(p.inscricaoFim),
  dataProva: dateOnly(p.dataProva),
  taxaInscricao: Number(p.taxaInscricao),
  totalInscricoes: p._count?.inscricoes,
});

export async function GET() {
  try {
    const guard = await requirePermission("selecao:ler");
    if (guard instanceof NextResponse) return guard;

    const data = await prisma.processoSeletivo.findMany({
      orderBy: { criadoEm: "desc" },
      include: { _count: { select: { inscricoes: true } } },
    });
    return NextResponse.json({ data: data.map(processoDTO) });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar processos" }, { status: 500 });
  }
}

const createSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  vagas: z.coerce.number().int().min(0),
  inscricaoInicio: z.string(),
  inscricaoFim: z.string(),
  dataProva: z.string().optional(),
  taxaInscricao: z.coerce.number().min(0).optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("selecao:criar");
    if (guard instanceof NextResponse) return guard;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    const b = parsed.data;

    const proc = await prisma.processoSeletivo.create({
      data: {
        nome: b.nome,
        descricao: b.descricao ?? null,
        vagas: b.vagas,
        inscricaoInicio: toDate(b.inscricaoInicio)!,
        inscricaoFim: toDate(b.inscricaoFim)!,
        dataProva: toDate(b.dataProva),
        taxaInscricao: b.taxaInscricao ?? 0,
      },
    });
    await logAudit({ acao: "selecao:create", recurso: "ProcessoSeletivo", recursoId: proc.id, depois: processoDTO(proc) });
    return NextResponse.json(processoDTO(proc), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar processo" }, { status: 500 });
  }
}
