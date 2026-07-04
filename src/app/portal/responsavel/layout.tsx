import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { currentResponsavelId } from "@/lib/portal";
import { signOutAction } from "@/app/(app)/actions";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";

export default async function PortalResponsavelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user?.papel !== "responsavel") redirect("/");

  const responsavelId = await currentResponsavelId();
  const responsavel = responsavelId
    ? await prisma.responsavel.findUnique({ where: { id: responsavelId }, select: { nome: true } })
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto w-full flex items-center gap-6 px-6 h-16">
          <span className="font-bold text-lg">ERP Escola</span>
          {responsavelId && (
            <nav className="hidden md:flex items-center gap-1 text-sm">
              <Link
                href="/portal/responsavel"
                className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Início
              </Link>
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            {responsavel && <span className="text-sm font-medium hidden sm:inline">{responsavel.nome}</span>}
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">
        {responsavelId ? (
          children
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Conta não vinculada. Procure a secretaria.
          </div>
        )}
      </main>
    </div>
  );
}
