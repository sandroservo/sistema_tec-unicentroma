import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { num } from "@/lib/serialize";
import { ReciboDoc } from "@/lib/pdf/recibo";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("cobranca:ler");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const r = await prisma.recebimento.findUnique({
    where: { id: parseInt(id) },
    include: { aluno: { select: { nome: true, cpf: true } }, itens: true },
  });
  if (!r) return NextResponse.json({ error: "Recebimento não encontrado" }, { status: 404 });

  const recebidoPor = r.recebidoPorUserId
    ? await prisma.user.findUnique({ where: { id: r.recebidoPorUserId }, select: { nome: true } })
    : null;

  const total = num(r.valor);
  const valorRecebido = r.valorRecebido ? num(r.valorRecebido) : null;
  const troco =
    r.metodo === "dinheiro" && valorRecebido !== null
      ? Math.round((valorRecebido - total) * 100) / 100
      : null;

  const buffer = await renderToBuffer(
    <ReciboDoc
      numero={`REC-${String(r.id).padStart(6, "0")}`}
      alunoNome={r.aluno.nome}
      alunoCpf={r.aluno.cpf}
      itens={r.itens.map((i) => ({ descricao: i.descricao, valor: num(i.valor) }))}
      total={total}
      metodo={r.metodo}
      valorRecebido={valorRecebido}
      troco={troco}
      dataHora={r.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
      recebidoPor={recebidoPor?.nome ?? "—"}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${r.id}.pdf"`,
    },
  });
}
