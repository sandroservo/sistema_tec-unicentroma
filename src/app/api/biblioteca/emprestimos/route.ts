import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const hoje = () => new Date(new Date().toISOString().slice(0, 10));

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("biblioteca:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const alunoId = sp.get("alunoId");
    const status = sp.get("status") ?? undefined;

    const where: Record<string, unknown> = {};
    if (alunoId) where.alunoId = parseInt(alunoId);
    if (status && status !== "atrasado") where.status = status;

    const emprestimos = await prisma.emprestimo.findMany({
      where,
      orderBy: { dataEmprestimo: "desc" },
      include: {
        aluno: { select: { nome: true } },
        exemplar: { select: { codigo: true, titulo: { select: { titulo: true } } } },
        multa: true,
      },
    });

    const h = hoje();
    let data = emprestimos.map((e) => {
      const atrasado = e.status === "aberto" && e.dataPrevista < h;
      return {
        id: e.id,
        exemplarId: e.exemplarId,
        alunoId: e.alunoId,
        alunoNome: e.aluno.nome,
        exemplarCodigo: e.exemplar.codigo,
        tituloNome: e.exemplar.titulo.titulo,
        dataEmprestimo: dateOnly(e.dataEmprestimo),
        dataPrevista: dateOnly(e.dataPrevista),
        dataDevolucao: dateOnly(e.dataDevolucao),
        status: atrasado ? "atrasado" : e.status,
        multa: e.multa ? { id: e.multa.id, valor: Number(e.multa.valor), paga: e.multa.paga } : null,
      };
    });

    if (status === "atrasado") data = data.filter((e) => e.status === "atrasado");

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar empréstimos" }, { status: 500 });
  }
}

const emprestarSchema = z.object({
  exemplarId: z.number().int(),
  alunoId: z.number().int(),
  prazoDias: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("biblioteca:emprestar");
    if (guard instanceof NextResponse) return guard;

    const parsed = emprestarSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const { exemplarId, alunoId, prazoDias = 14 } = parsed.data;

    const dataPrevista = new Date(hoje());
    dataPrevista.setDate(dataPrevista.getDate() + prazoDias);

    const emprestimo = await prisma.$transaction(async (tx) => {
      const exemplar = await tx.exemplar.findUnique({ where: { id: exemplarId } });
      if (!exemplar) throw new Error("EXEMPLAR_NAO_ENCONTRADO");
      if (exemplar.status !== "disponivel") throw new Error("EXEMPLAR_INDISPONIVEL");

      const emp = await tx.emprestimo.create({
        data: { exemplarId, alunoId, dataPrevista, status: "aberto" },
      });
      await tx.exemplar.update({ where: { id: exemplarId }, data: { status: "emprestado" } });
      return emp;
    });

    await logAudit({ acao: "emprestimo:create", recurso: "Emprestimo", recursoId: emprestimo.id, depois: emprestimo });
    return NextResponse.json(emprestimo, { status: 201 });
  } catch (e) {
    const msg = (e as Error)?.message;
    if (msg === "EXEMPLAR_INDISPONIVEL")
      return NextResponse.json({ error: "Exemplar não está disponível" }, { status: 409 });
    if (msg === "EXEMPLAR_NAO_ENCONTRADO")
      return NextResponse.json({ error: "Exemplar não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao registrar empréstimo" }, { status: 500 });
  }
}
