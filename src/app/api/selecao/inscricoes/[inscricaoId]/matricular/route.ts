import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function POST(_req: Request, { params }: { params: Promise<{ inscricaoId: string }> }) {
  try {
    const guard = await requirePermission("selecao:convocar");
    if (guard instanceof NextResponse) return guard;

    const id = Number((await params).inscricaoId);

    const result = await prisma.$transaction(async (tx) => {
      const insc = await tx.inscricao.findUnique({ where: { id } });
      if (!insc) return { error: "Inscrição não encontrada", status: 404 as const };
      if (!["convocado", "aprovado"].includes(insc.status)) {
        return { error: "Inscrição precisa estar convocada ou aprovada para matricular", status: 409 as const };
      }
      if (insc.alunoId) return { ok: true, alunoId: insc.alunoId, already: true };

      // Reusa Aluno existente por cpf/email; senão cria. Trata corrida via P2002.
      let aluno = await tx.aluno.findFirst({ where: { OR: [{ cpf: insc.cpf }, { email: insc.email }] } });
      if (!aluno) {
        try {
          aluno = await tx.aluno.create({
            data: { nome: insc.nome, email: insc.email, cpf: insc.cpf, telefone: insc.telefone ?? null, status: "ativo" },
          });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            aluno = await tx.aluno.findFirst({ where: { OR: [{ cpf: insc.cpf }, { email: insc.email }] } });
          } else throw e;
        }
      }
      if (!aluno) return { error: "Não foi possível resolver o aluno", status: 500 as const };

      await tx.inscricao.update({ where: { id }, data: { alunoId: aluno.id, status: "matriculado" } });
      return { ok: true, alunoId: aluno.id };
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

    await logAudit({ acao: "inscricao:matricular", recurso: "Inscricao", recursoId: id, depois: { alunoId: result.alunoId } });
    return NextResponse.json({ ok: true, alunoId: result.alunoId });
  } catch {
    return NextResponse.json({ error: "Erro ao matricular" }, { status: 500 });
  }
}
