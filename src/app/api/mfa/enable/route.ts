import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/authz";
import { verifyTotp, generateRecoveryCodes } from "@/lib/mfa";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ secret: z.string().min(16), codigo: z.string().min(6) });

// Confirma o secret com um código válido e ativa o MFA. Retorna os códigos de recuperação UMA vez.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { secret, codigo } = parsed.data;
  if (!verifyTotp(codigo, secret)) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const { plain, hashed } = await generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: secret, mfaEnabled: true, recoveryCodes: hashed },
  });
  await logAudit({ acao: "mfa:enable", recurso: "User", recursoId: user.id });

  return NextResponse.json({ ok: true, recoveryCodes: plain });
}
