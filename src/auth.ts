import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { whereFromIdentificador } from "@/lib/identify";
import { verifyTotp, matchRecoveryCode } from "@/lib/mfa";

// Google só é habilitado quando as credenciais existem (login corporativo Workspace).
const googleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const providers: NextAuthConfig["providers"] = [
    Credentials({
      credentials: {
        // Identificador único: aceita CPF, e-mail OU matrícula.
        identificador: { label: "CPF, e-mail ou matrícula", type: "text" },
        senha: { label: "Senha", type: "password" },
        // Código MFA (TOTP ou de recuperação) — exigido só se o usuário tiver MFA ativo.
        codigo: { label: "Código MFA", type: "text" },
      },
      authorize: async (creds) => {
        const raw = String(creds?.identificador ?? "").trim();
        const senha = String(creds?.senha ?? "");
        if (!raw || !senha) return null;

        const user = await prisma.user.findUnique({ where: whereFromIdentificador(raw) });
        if (!user || !user.ativo) return null;

        const ok = await bcrypt.compare(senha, user.senhaHash);
        if (!ok) return null;

        // Segundo fator, quando ativo.
        if (user.mfaEnabled && user.mfaSecret) {
          const codigo = String(creds?.codigo ?? "").trim();
          if (!codigo) return null;
          const okTotp = verifyTotp(codigo, user.mfaSecret);
          if (!okTotp) {
            const usado = await matchRecoveryCode(codigo, user.recoveryCodes);
            if (!usado) return null;
            // Consome o código de recuperação usado.
            await prisma.user.update({
              where: { id: user.id },
              data: { recoveryCodes: user.recoveryCodes.filter((c) => c !== usado) },
            });
          }
        }

        return { id: user.id, name: user.nome, email: user.email, papel: user.papel };
      },
    }),
];

if (googleEnabled) providers.push(Google);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    // Google: só permite login de e-mail já cadastrado e ativo (sem auto-provisionamento).
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;
        const dbUser = await prisma.user.findUnique({ where: { email } });
        if (!dbUser || !dbUser.ativo) return false;
      }
      return true;
    },
    // Enriquece o token com id/papel — credentials via `user`, Google via lookup no BD (roda no runtime node do /api/auth).
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.papel = (user as { papel?: string }).papel;
      }
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: String(token.email).toLowerCase() },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.papel = dbUser.papel;
        }
      }
      return token;
    },
  },
});
