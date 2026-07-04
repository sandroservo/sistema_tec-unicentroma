import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

export async function GET() {
  try {
    const guard = await requirePermission("dashboard:ler");
    if (guard instanceof NextResponse) return guard;

    const data = await prisma.atividade.findMany({ orderBy: { criadoEm: "desc" }, take: 20 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar atividades recentes" }, { status: 500 });
  }
}
