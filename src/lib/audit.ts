import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/authz";
import type { Prisma } from "@prisma/client";

type AuditInput = {
  acao: string; // ex: "aluno:update"
  recurso: string; // ex: "Aluno"
  recursoId?: string | number | null;
  antes?: unknown;
  depois?: unknown;
};

/** Registra uma operação de escrita na trilha de auditoria. Nunca lança (best-effort). */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const user = await currentUser();
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");

    await prisma.auditLog.create({
      data: {
        userId: user?.id ?? null,
        acao: input.acao,
        recurso: input.recurso,
        recursoId: input.recursoId != null ? String(input.recursoId) : null,
        antes: (input.antes ?? undefined) as Prisma.InputJsonValue | undefined,
        depois: (input.depois ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: ip ?? null,
      },
    });
  } catch {
    // auditoria não deve quebrar a operação principal
  }
}
