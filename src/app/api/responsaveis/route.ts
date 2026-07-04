import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const guard = await requirePermission("aluno:editar");
  if (guard instanceof NextResponse) return guard;

  const responsaveis = await prisma.responsavel.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      email: true,
      parentesco: true,
      _count: { select: { alunos: true } },
    },
  });

  return NextResponse.json(
    responsaveis.map((r) => ({
      id: r.id,
      nome: r.nome,
      email: r.email,
      parentesco: r.parentesco,
      numAlunos: r._count.alunos,
    })),
  );
}

const createSchema = z.object({
  nome: z.string().trim().min(2),
  email: z.string().trim().email(),
  cpf: z.string().trim().min(1).optional(),
  telefone: z.string().trim().min(1).optional(),
  parentesco: z.enum(["pai", "mae", "responsavel"]),
  alunoIds: z.array(z.number().int()).default([]),
  senha: z.string().min(6),
});

export async function POST(req: Request) {
  const guard = await requirePermission("aluno:editar");
  if (guard instanceof NextResponse) return guard;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { nome, email, cpf, telefone, parentesco, alunoIds, senha } = parsed.data;

  try {
    const responsavel = await prisma.$transaction(async (tx) => {
      const r = await tx.responsavel.create({
        data: {
          nome,
          email,
          cpf: cpf ?? null,
          telefone: telefone ?? null,
          parentesco,
          alunos: { connect: alunoIds.map((id) => ({ id })) },
        },
      });
      await tx.user.create({
        data: {
          nome,
          email,
          papel: "responsavel",
          senhaHash: await bcrypt.hash(senha, 10),
          responsavelId: r.id,
          ativo: true,
        },
      });
      return r;
    });

    await logAudit({ acao: "responsavel:create", recurso: "Responsavel", recursoId: responsavel.id, depois: responsavel });
    return NextResponse.json(responsavel, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002")
      return NextResponse.json({ error: "Email ou CPF já cadastrado" }, { status: 409 });
    return NextResponse.json({ error: "Erro ao criar responsável" }, { status: 500 });
  }
}
