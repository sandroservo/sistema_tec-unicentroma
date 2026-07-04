import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

/** Sessão atual ou null. */
export async function currentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Guard para route handlers: retorna { user } se autorizado, ou um NextResponse 401/403.
 * Uso:
 *   const guard = await requirePermission("aluno:criar");
 *   if (guard instanceof NextResponse) return guard;
 *   const { user } = guard;
 */
export async function requirePermission(perm: string) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!hasPermission(user.papel, perm)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  return { user };
}

/** Checagem booleana em Server Components / actions. */
export async function can(perm: string): Promise<boolean> {
  const user = await currentUser();
  return hasPermission(user?.papel, perm);
}
