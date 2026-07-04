import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MfaCard } from "@/components/mfa-card";

export default async function SegurancaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Segurança da conta</h1>
        <p className="text-muted-foreground">Gerencie a verificação em duas etapas.</p>
      </div>
      <MfaCard enabled={user?.mfaEnabled ?? false} />
    </div>
  );
}
