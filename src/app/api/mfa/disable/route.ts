import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/authz";
import { verifyTotp, matchRecoveryCode } from "@/lib/mfa";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const schema = z.object({ codigo: z.string().min(6) });

// Desativa o MFA mediante um código TOTP (ou de recuperação) válido.
export async function POST(req: Request) {
  const sessionUser = await currentUser();
  if (!sessionUser) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json({ error: "MFA não está ativo" }, { status: 400 });
  }

  const { codigo } = parsed.data;
  const okTotp = verifyTotp(codigo, user.mfaSecret);
  const okRecovery = !okTotp && (await matchRecoveryCode(codigo, user.recoveryCodes)) !== null;
  if (!okTotp && !okRecovery) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: null, mfaEnabled: false, recoveryCodes: [] },
  });
  await logAudit({ acao: "mfa:disable", recurso: "User", recursoId: user.id });

  return NextResponse.json({ ok: true });
}
