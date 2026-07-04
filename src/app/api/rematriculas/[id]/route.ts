import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, currentUser } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { notificarAluno } from "@/lib/notify";

const patchSchema = z.object({
  status: z.enum(["aprovada", "recusada"]),
  observacao: z.string().trim().max(2000).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("matricula:criar");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const user = await currentUser();
  const rema = await prisma.rematricula.findUnique({ where: { id: Number(id) } });
  if (!rema) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  if (rema.status !== "solicitada") {
    return NextResponse.json({ error: "Solicitação já processada" }, { status: 409 });
  }

  if (parsed.data.status === "aprovada") {
    const turma = await prisma.turma.findUnique({ where: { id: rema.turmaDestinoId } });
    if (!turma) return NextResponse.json({ error: "Turma não encontrada" }, { status: 404 });
    if (turma.vagasOcupadas >= turma.vagas) {
      return NextResponse.json({ error: "Turma sem vagas" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.matricula.create({
        data: { alunoId: rema.alunoId, turmaId: rema.turmaDestinoId, status: "ativa" },
      }),
      prisma.turma.update({
        where: { id: rema.turmaDestinoId },
        data: { vagasOcupadas: { increment: 1 } },
      }),
      prisma.rematricula.update({
        where: { id: rema.id },
        data: {
          status: "aprovada",
          observacao: parsed.data.observacao ?? null,
          processadaPorUserId: user?.id ?? null,
        },
      }),
    ]);
  } else {
    await prisma.rematricula.update({
      where: { id: rema.id },
      data: {
        status: "recusada",
        observacao: parsed.data.observacao ?? null,
        processadaPorUserId: user?.id ?? null,
      },
    });
  }

  await logAudit({
    acao: "rematricula:processar",
    recurso: "Rematricula",
    recursoId: rema.id,
    antes: rema,
    depois: { status: parsed.data.status, observacao: parsed.data.observacao ?? null },
  });

  await notificarAluno(rema.alunoId, {
    titulo: "Rematrícula " + parsed.data.status,
    mensagem:
      parsed.data.status === "aprovada"
        ? "Sua solicitação de rematrícula foi aprovada."
        : "Sua solicitação de rematrícula foi recusada.",
    tipo: parsed.data.status === "aprovada" ? "sucesso" : "erro",
    link: "/portal/aluno/rematricula",
  });

  return NextResponse.json({ id: rema.id, status: parsed.data.status });
}
