import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("professor:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const search = sp.get("search") ?? undefined;
    const status = sp.get("status") ?? undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search)
      where.OR = [
        { nome: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];

    const data = await prisma.professor.findMany({ where, orderBy: { nome: "asc" } });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar professores" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("professor:criar");
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const professor = await prisma.professor.create({
      data: {
        nome: body.nome,
        email: body.email,
        cpf: body.cpf,
        telefone: body.telefone ?? null,
        especialidade: body.especialidade ?? null,
        titulacao: body.titulacao ?? null,
        status: body.status ?? "ativo",
        foto: body.foto ?? null,
      },
    });
    await logAudit({ acao: "professor:create", recurso: "Professor", recursoId: professor.id, depois: professor });
    return NextResponse.json(professor, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar professor" }, { status: 500 });
  }
}
