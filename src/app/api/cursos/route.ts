import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cursoDTO } from "@/lib/dto";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("curso:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const search = sp.get("search") ?? undefined;
    const modalidade = sp.get("modalidade") ?? undefined;
    const status = sp.get("status") ?? undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (modalidade) where.modalidade = modalidade;
    if (search) where.nome = { contains: search, mode: "insensitive" };

    const data = await prisma.curso.findMany({ where, orderBy: { nome: "asc" } });
    return NextResponse.json(data.map(cursoDTO));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar cursos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("curso:criar");
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const curso = await prisma.curso.create({
      data: {
        nome: body.nome,
        descricao: body.descricao ?? null,
        cargaHoraria: body.cargaHoraria,
        modalidade: body.modalidade ?? "presencial",
        valor: String(body.valor ?? "0"),
        status: body.status ?? "ativo",
        area: body.area ?? null,
      },
    });
    await logAudit({ acao: "curso:create", recurso: "Curso", recursoId: curso.id, depois: cursoDTO(curso) });
    return NextResponse.json(cursoDTO(curso), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar curso" }, { status: 500 });
  }
}
