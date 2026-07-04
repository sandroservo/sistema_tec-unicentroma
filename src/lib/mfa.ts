import { authenticator } from "otplib";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const ISSUER = "ERP Escola";

export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

/** URL otpauth:// para gerar o QR no app autenticador. */
export function otpauthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

/** Verifica um código TOTP de 6 dígitos contra o secret. Tolera drift de ±1 janela. */
export function verifyTotp(codigo: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: codigo.replace(/\s/g, ""), secret });
  } catch {
    return false;
  }
}

/** Gera N códigos de recuperação (retorna os planos p/ mostrar 1x + os hashes p/ salvar). */
export async function generateRecoveryCodes(n = 8): Promise<{ plain: string[]; hashed: string[] }> {
  const plain = Array.from({ length: n }, () =>
    randomBytes(5).toString("hex").toUpperCase().replace(/(.{5})(.{5})/, "$1-$2"),
  );
  const hashed = await Promise.all(plain.map((c) => bcrypt.hash(c, 10)));
  return { plain, hashed };
}

/** Confere um código de recuperação; retorna o hash consumido (p/ remover) ou null. */
export async function matchRecoveryCode(codigo: string, hashed: string[]): Promise<string | null> {
  const alvo = codigo.trim().toUpperCase();
  for (const h of hashed) {
    if (await bcrypt.compare(alvo, h)) return h;
  }
  return null;
}
