import { prisma } from "@/lib/prisma";

type Tipo = "info" | "sucesso" | "alerta" | "erro";

export async function createNotificacao(input: {
  userId: string;
  titulo: string;
  mensagem: string;
  tipo?: Tipo;
  link?: string;
}) {
  try {
    return await prisma.notificacao.create({
      data: {
        userId: input.userId,
        titulo: input.titulo,
        mensagem: input.mensagem,
        tipo: input.tipo ?? "info",
        link: input.link ?? null,
      },
    });
  } catch {
    // ponytail: best-effort; notificação nunca deve derrubar a operação de origem
    return null;
  }
}

/** Notifica o User vinculado a um Aluno. No-op se não houver vínculo. */
export async function notificarAluno(
  alunoId: number,
  n: { titulo: string; mensagem: string; tipo?: Tipo; link?: string },
) {
  try {
    const user = await prisma.user.findUnique({ where: { alunoId } });
    if (!user) return null;
    return await createNotificacao({ userId: user.id, ...n });
  } catch {
    return null;
  }
}
