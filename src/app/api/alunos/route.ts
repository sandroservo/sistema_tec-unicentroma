import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { alunoDTO } from "@/lib/dto";
import { toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("aluno:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const search = sp.get("search") ?? undefined;
    const status = sp.get("status") ?? undefined;
    const pageNum = Math.max(1, parseInt(sp.get("page") ?? "1"));
    const limitNum = Math.min(100, parseInt(sp.get("limit") ?? "20") || 20);
    const offset = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = { excluidoEm: null };
    if (status) where.status = status;
    if (search)
      where.OR = [
        { nome: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { cpf: { contains: search, mode: "insensitive" } },
      ];

    const [data, total] = await Promise.all([
      prisma.aluno.findMany({ where, take: limitNum, skip: offset, orderBy: { nome: "asc" } }),
      prisma.aluno.count({ where }),
    ]);

    return NextResponse.json({ data: data.map(alunoDTO), total, page: pageNum, limit: limitNum });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar alunos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("aluno:criar");
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const aluno = await prisma.aluno.create({
      data: {
        nome: body.nome,
        email: body.email,
        cpf: body.cpf,
        telefone: body.telefone ?? null,
        dataNascimento: toDate(body.dataNascimento),
        endereco: body.endereco ?? null,
        cidade: body.cidade ?? null,
        estado: body.estado ?? null,
        cep: body.cep ?? null,
        status: body.status ?? "ativo",
        foto: body.foto ?? null,
      },
    });
    await logAudit({ acao: "aluno:create", recurso: "Aluno", recursoId: aluno.id, depois: alunoDTO(aluno) });
    return NextResponse.json(alunoDTO(aluno), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar aluno" }, { status: 500 });
  }
}
