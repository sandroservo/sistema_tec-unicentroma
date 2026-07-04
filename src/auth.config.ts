import type { NextAuthConfig } from "next-auth";

// Config edge-safe (sem Prisma/bcrypt) — usada pelo middleware.
// Os providers com acesso ao BD são adicionados em auth.ts (runtime node).
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    // Edge-safe: só manipula token/session, sem acesso a BD.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.papel = user.papel;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.papel = (token.papel as string) ?? "";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
