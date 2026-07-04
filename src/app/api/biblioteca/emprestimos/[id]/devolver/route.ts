import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const VALOR_DIARIO = 1.0;
const MS_DIA = 1000 * 60 * 60 * 24;
const hoje = () => new Date(new Date().toISOString().slice(0, 10));

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("biblioteca:emprestar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const emprestimoId = parseInt(id);
    const dataDevolucao = hoje();

    const result = await prisma.$transaction(async (tx) => {
      const emp = await tx.emprestimo.findUnique({ where: { id: emprestimoId } });
      if (!emp) throw new Error("NAO_ENCONTRADO");
      if (emp.status === "devolvido") throw new Error("JA_DEVOLVIDO");

      const devolvido = await tx.emprestimo.update({
        where: { id: emprestimoId },
        data: { status: "devolvido", dataDevolucao },
      });
      await tx.exemplar.update({ where: { id: emp.exemplarId }, data: { status: "disponivel" } });

      let multa = null;
      if (dataDevolucao > emp.dataPrevista) {
        const diasAtraso = Math.ceil((dataDevolucao.getTime() - emp.dataPrevista.getTime()) / MS_DIA);
        multa = await tx.multa.create({
          data: { emprestimoId, valor: diasAtraso * VALOR_DIARIO, paga: false },
        });
      }

      // TODO: notificar próximo da fila (reserva ativa para o título)

      return { devolvido, multa };
    });

    await logAudit({ acao: "emprestimo:devolver", recurso: "Emprestimo", recursoId: emprestimoId, depois: result.devolvido });
    return NextResponse.json({
      devolvido: result.devolvido,
      multa: result.multa ? { id: result.multa.id, valor: Number(result.multa.valor), paga: result.multa.paga } : undefined,
    });
  } catch (e) {
    const msg = (e as Error)?.message;
    if (msg === "NAO_ENCONTRADO")
      return NextResponse.json({ error: "Empréstimo não encontrado" }, { status: 404 });
    if (msg === "JA_DEVOLVIDO")
      return NextResponse.json({ error: "Empréstimo já devolvido" }, { status: 409 });
    return NextResponse.json({ error: "Erro ao registrar devolução" }, { status: 500 });
  }
}
