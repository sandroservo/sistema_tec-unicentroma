import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { currentAlunoId } from "@/lib/portal";
import { signOutAction } from "@/app/(app)/actions";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/portal/aluno", label: "Início" },
  { href: "/portal/aluno/notas", label: "Notas" },
  { href: "/portal/aluno/frequencia", label: "Frequência" },
  { href: "/portal/aluno/financeiro", label: "Financeiro" },
  { href: "/portal/aluno/grade", label: "Grade" },
  { href: "/portal/aluno/calendario", label: "Calendário" },
  { href: "/portal/aluno/documentos", label: "Documentos" },
  { href: "/portal/aluno/requerimentos", label: "Requerimentos" },
  { href: "/portal/aluno/ocorrencias", label: "Ocorrências" },
  { href: "/portal/aluno/rematricula", label: "Rematrícula" },
];

export default async function PortalAlunoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user?.papel !== "aluno") redirect("/");

  const alunoId = await currentAlunoId();
  const aluno = alunoId
    ? await prisma.aluno.findUnique({ where: { id: alunoId }, select: { nome: true } })
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto w-full flex items-center gap-6 px-6 h-16">
          <span className="font-bold text-lg">ERP Escola</span>
          {alunoId && (
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
            {aluno && <span className="text-sm font-medium hidden sm:inline">{aluno.nome}</span>}
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
        {alunoId && (
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
        {alunoId ? (
          children
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Sua conta ainda não está vinculada a um cadastro de aluno. Procure a secretaria.
          </div>
        )}
      </main>
    </div>
  );
}
