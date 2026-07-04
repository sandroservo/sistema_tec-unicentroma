import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("biblioteca:ler");
    if (guard instanceof NextResponse) return guard;

    const tituloId = new URL(req.url).searchParams.get("tituloId");
    const exemplares = await prisma.exemplar.findMany({
      where: tituloId ? { tituloId: parseInt(tituloId) } : {},
      orderBy: { codigo: "asc" },
    });
    return NextResponse.json({ data: exemplares });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar exemplares" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("biblioteca:criar");
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const codigo = body.codigo || "EX-" + Math.random().toString(36).slice(2, 10).toUpperCase();
    const exemplar = await prisma.exemplar.create({
      data: {
        tituloId: Number(body.tituloId),
        codigo,
        status: body.status ?? "disponivel",
        localizacao: body.localizacao ?? null,
      },
    });
    await logAudit({ acao: "exemplar:create", recurso: "Exemplar", recursoId: exemplar.id, depois: exemplar });
    return NextResponse.json(exemplar, { status: 201 });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002")
      return NextResponse.json({ error: "Código já existe" }, { status: 409 });
    return NextResponse.json({ error: "Erro ao criar exemplar" }, { status: 500 });
  }
}
