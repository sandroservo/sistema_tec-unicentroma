import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, currentUser } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { createNotificacao } from "@/lib/notify";

const STATUS = ["aberto", "em_andamento", "concluido", "indeferido"] as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("requerimento:ler");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const r = await prisma.requerimento.findUnique({
    where: { id: Number(id) },
    include: { aluno: { select: { nome: true } } },
  });
  if (!r) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { aluno, ...rest } = r;
  return NextResponse.json({ ...rest, alunoNome: aluno?.nome ?? null });
}

const patchSchema = z.object({
  status: z.enum(STATUS),
  resposta: z.string().trim().max(4000).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("requerimento:atender");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const user = await currentUser();
  const req0 = await prisma.requerimento.findUnique({ where: { id: Number(id) } });
  if (!req0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const updated = await prisma.requerimento.update({
    where: { id: Number(id) },
    data: {
      status: parsed.data.status,
      resposta: parsed.data.resposta ?? null,
      atendidoPorUserId: user?.id ?? null,
    },
  });

  await logAudit({
    acao: "requerimento:atender",
    recurso: "Requerimento",
    recursoId: updated.id,
    antes: req0,
    depois: updated,
  });

  const aluoUser = await prisma.user.findUnique({ where: { alunoId: updated.alunoId } });
  if (aluoUser) {
    await createNotificacao({
      userId: aluoUser.id,
      titulo: "Requerimento " + updated.status,
      mensagem: "Seu requerimento " + updated.protocolo + " foi atualizado.",
      tipo:
        updated.status === "concluido"
          ? "sucesso"
          : updated.status === "indeferido"
            ? "erro"
            : "info",
      link: "/portal/aluno/requerimentos",
    });
  }

  return NextResponse.json(updated);
}
