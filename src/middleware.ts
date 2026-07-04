import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Protege tudo, exceto login, assets e as rotas de auth.
// Rotas públicas (sem login): login, recuperação de senha e inscrição em processo seletivo.
const PUBLIC_PREFIXES = ["/login", "/esqueci-senha", "/redefinir-senha", "/inscricao", "/api/inscricao"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isLoggedIn = !!req.auth;

  if (!isLoggedIn && !isPublic) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
  if (isLoggedIn && pathname.startsWith("/login")) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  // Landing por papel (só navegação de páginas; APIs e portais próprios passam).
  if (isLoggedIn && !pathname.startsWith("/api")) {
    const papel = req.auth?.user?.papel;
    if (papel === "aluno" && !pathname.startsWith("/portal/aluno")) {
      return Response.redirect(new URL("/portal/aluno", req.nextUrl));
    }
    if (papel === "professor" && !pathname.startsWith("/portal/professor")) {
      return Response.redirect(new URL("/portal/professor", req.nextUrl));
    }
    if (papel === "responsavel" && !pathname.startsWith("/portal/responsavel")) {
      return Response.redirect(new URL("/portal/responsavel", req.nextUrl));
    }
    // Papéis administrativos não acessam os portais.
    const isAdminRole = papel && !["aluno", "professor", "responsavel"].includes(papel);
    if (isAdminRole && pathname.startsWith("/portal/")) {
      return Response.redirect(new URL("/", req.nextUrl));
    }
  }
});

export const config = {
  // Roda em tudo menos next internals, a API de auth e arquivos estáticos (por extensão).
  matcher: [
    "/((?!api/auth|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf)).*)",
  ],
};
