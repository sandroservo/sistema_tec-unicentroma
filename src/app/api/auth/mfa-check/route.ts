import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { whereFromIdentificador } from "@/lib/identify";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

// Pré-checagem do login: valida senha e informa se MFA é exigido, ANTES de pedir o código.
// Só revela mfaRequired após a senha estar correta (não vaza existência de conta).
// ponytail: sem rate-limit aqui; adicionar (ex: por IP) quando expor publicamente em produção.
export async function POST(req: Request) {
  // Anti brute-force: 10 tentativas por IP a cada 60s.
  const rl = rateLimit(`mfa-check:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Tente novamente em instantes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
  }

  const body = await req.json().catch(() => null);
  const raw = String(body?.identificador ?? "").trim();
  const senha = String(body?.senha ?? "");
  if (!raw || !senha) return NextResponse.json({ ok: false }, { status: 200 });

  const user = await prisma.user.findUnique({ where: whereFromIdentificador(raw) });
  if (!user || !user.ativo) return NextResponse.json({ ok: false }, { status: 200 });

  const ok = await bcrypt.compare(senha, user.senhaHash);
  if (!ok) return NextResponse.json({ ok: false }, { status: 200 });

  return NextResponse.json({ ok: true, mfaRequired: user.mfaEnabled });
}
