import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // Redirect por papel (aluno/professor → portais) fica no middleware.
  const papel = session.user?.papel ?? "";

  return (
    <AppSidebar papel={papel} userName={session.user?.name ?? undefined}>
      {children}
    </AppSidebar>
  );
}
