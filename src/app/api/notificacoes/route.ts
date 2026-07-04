import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/authz";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [itens, naoLidas] = await Promise.all([
    prisma.notificacao.findMany({
      where: { userId: user.id },
      orderBy: { criadoEm: "desc" },
      take: 50,
    }),
    prisma.notificacao.count({ where: { userId: user.id, lida: false } }),
  ]);

  return NextResponse.json({ itens, naoLidas });
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "number" ? body.id : undefined;

  await prisma.notificacao.updateMany({
    where: { userId: user.id, ...(id ? { id } : {}) },
    data: { lida: true },
  });

  return NextResponse.json({ ok: true });
}
