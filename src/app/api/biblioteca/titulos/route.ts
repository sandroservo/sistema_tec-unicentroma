import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("biblioteca:ler");
    if (guard instanceof NextResponse) return guard;

    const search = new URL(req.url).searchParams.get("search") ?? undefined;
    const where = search
      ? {
          OR: [
            { titulo: { contains: search, mode: "insensitive" as const } },
            { autor: { contains: search, mode: "insensitive" as const } },
            { isbn: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const titulos = await prisma.titulo.findMany({
      where,
      orderBy: { titulo: "asc" },
      include: { exemplares: { select: { status: true } } },
    });

    const data = titulos.map(({ exemplares, ...t }) => ({
      ...t,
      totalExemplares: exemplares.length,
      disponiveis: exemplares.filter((e) => e.status === "disponivel").length,
    }));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar títulos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("biblioteca:criar");
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const titulo = await prisma.titulo.create({
      data: {
        titulo: body.titulo,
        autor: body.autor ?? null,
        isbn: body.isbn ?? null,
        editora: body.editora ?? null,
        ano: body.ano != null ? Number(body.ano) : null,
        categoria: body.categoria ?? null,
      },
    });
    await logAudit({ acao: "titulo:create", recurso: "Titulo", recursoId: titulo.id, depois: titulo });
    return NextResponse.json(titulo, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar título" }, { status: 500 });
  }
}
