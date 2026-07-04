import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/email";

// Reset de senha (público). SEMPRE responde 200 {ok:true} para não vazar
// se o identificador existe.
export async function POST(req: Request) {
  try {
    const { identificador } = await req.json();
    const raw = String(identificador ?? "").trim();
    if (!raw) return NextResponse.json({ ok: true });

    // Mesma resolução de identificador do authorize (src/auth.ts).
    const isEmail = raw.includes("@");
    const digits = raw.replace(/\D/g, "");
    const where = isEmail
      ? { email: raw.toLowerCase() }
      : digits.length === 11
        ? { cpf: digits }
        : { matricula: raw };

    const user = await prisma.user.findUnique({ where });
    if (user && user.ativo) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
      const base = process.env.APP_URL ?? new URL(req.url).origin;
      const link = `${base}/redefinir-senha?token=${token}`;
      // Envia por e-mail (se SMTP configurado); senão o helper loga o link no console (dev).
      await enviarEmail({
        to: user.email,
        subject: "Redefinição de senha — ERP Escola",
        html: `<p>Olá, ${user.nome}.</p><p>Para redefinir sua senha, acesse (válido por 1 hora):</p><p><a href="${link}">${link}</a></p><p>Se não foi você, ignore este e-mail.</p>`,
      });
    }
  } catch {
    // não vaza erro
  }
  return NextResponse.json({ ok: true });
}
