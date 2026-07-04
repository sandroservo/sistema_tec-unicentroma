import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import * as z from "zod";

type Row = Record<string, any>;
const processoDTO = (p: Row) => ({
  ...p,
  inscricaoInicio: dateOnly(p.inscricaoInicio),
  inscricaoFim: dateOnly(p.inscricaoFim),
  dataProva: dateOnly(p.dataProva),
  taxaInscricao: Number(p.taxaInscricao),
});
const inscricaoDTO = (i: Row) => ({ ...i, nota: i.nota == null ? null : Number(i.nota) });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("selecao:ler");
    if (guard instanceof NextResponse) return guard;

    const id = Number((await params).id);
    const proc = await prisma.processoSeletivo.findUnique({
      where: { id },
      include: { inscricoes: { orderBy: [{ classificacao: "asc" }, { nome: "asc" }] } },
    });
    if (!proc) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

    return NextResponse.json({ ...processoDTO(proc), inscricoes: proc.inscricoes.map(inscricaoDTO) });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar processo" }, { status: 500 });
  }
}

const patchSchema = z.object({
  nome: z.string().min(2).optional(),
  descricao: z.string().nullable().optional(),
  vagas: z.coerce.number().int().min(0).optional(),
  inscricaoInicio: z.string().optional(),
  inscricaoFim: z.string().optional(),
  dataProva: z.string().nullable().optional(),
  taxaInscricao: z.coerce.number().min(0).optional(),
  status: z.enum(["aberto", "encerrado", "resultado"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("selecao:editar");
    if (guard instanceof NextResponse) return guard;

    const id = Number((await params).id);
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    const b = parsed.data;

    const data: Row = {};
    if (b.nome !== undefined) data.nome = b.nome;
    if (b.descricao !== undefined) data.descricao = b.descricao;
    if (b.vagas !== undefined) data.vagas = b.vagas;
    if (b.inscricaoInicio !== undefined) data.inscricaoInicio = toDate(b.inscricaoInicio);
    if (b.inscricaoFim !== undefined) data.inscricaoFim = toDate(b.inscricaoFim);
    if (b.dataProva !== undefined) data.dataProva = toDate(b.dataProva);
    if (b.taxaInscricao !== undefined) data.taxaInscricao = b.taxaInscricao;
    if (b.status !== undefined) data.status = b.status;

    const proc = await prisma.processoSeletivo.update({ where: { id }, data });
    await logAudit({ acao: "selecao:update", recurso: "ProcessoSeletivo", recursoId: id, depois: processoDTO(proc) });
    return NextResponse.json(processoDTO(proc));
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar processo" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("selecao:excluir");
    if (guard instanceof NextResponse) return guard;

    const id = Number((await params).id);
    await prisma.processoSeletivo.delete({ where: { id } });
    await logAudit({ acao: "selecao:delete", recurso: "ProcessoSeletivo", recursoId: id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir processo" }, { status: 500 });
  }
}
