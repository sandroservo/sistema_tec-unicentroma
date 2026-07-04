import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { currentProfessorId } from "@/lib/portal";
import { signOutAction } from "@/app/(app)/actions";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/portal/professor", label: "Início" },
  { href: "/portal/professor/turmas", label: "Minhas Turmas" },
];

export default async function PortalProfessorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user?.papel !== "professor") redirect("/");

  const professorId = await currentProfessorId();
  const professor = professorId
    ? await prisma.professor.findUnique({ where: { id: professorId }, select: { nome: true } })
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto w-full flex items-center gap-6 px-6 h-16">
          <span className="font-bold text-lg">ERP Escola</span>
          {professorId && (
            <nav className="hidden md:flex items-center gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            {professor && <span className="text-sm font-medium hidden sm:inline">{professor.nome}</span>}
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
        {professorId && (
          <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-6 pb-2 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-md whitespace-nowrap text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">
        {professorId ? (
          children
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Conta não vinculada a um professor. Procure a secretaria.
          </div>
        )}
      </main>
    </div>
  );
}
