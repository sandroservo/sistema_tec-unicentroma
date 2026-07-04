import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { ROLES } from "@/lib/rbac";

const publicSelect = {
  id: true,
  nome: true,
  email: true,
  cpf: true,
  matricula: true,
  telefone: true,
  papel: true,
  ativo: true,
  alunoId: true,
  professorId: true,
  criadoEm: true,
} as const;

const updateSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  cpf: z.string().optional(),
  matricula: z.string().optional(),
  telefone: z.string().optional(),
  papel: z.enum(ROLES).optional(),
  ativo: z.boolean().optional(),
  alunoId: z.coerce.number().int().positive().nullable().optional(),
  professorId: z.coerce.number().int().positive().nullable().optional(),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
});

function p2002(e: unknown): NextResponse | null {
  if ((e as { code?: string })?.code === "P2002") {
    return NextResponse.json(
      { error: "Já existe usuário com esse email/CPF/matrícula" },
      { status: 409 },
    );
  }
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("usuario:gerenciar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: publicSelect });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar usuário" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("usuario:gerenciar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { senha, email, cpf, matricula, telefone, ...rest } = parsed.data;

    const antes = await prisma.user.findUnique({ where: { id }, select: publicSelect });

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(email !== undefined && { email: email.toLowerCase() }),
        ...(cpf !== undefined && { cpf: cpf || null }),
        ...(matricula !== undefined && { matricula: matricula || null }),
        ...(telefone !== undefined && { telefone: telefone || null }),
        ...(senha ? { senhaHash: await bcrypt.hash(senha, 10) } : {}),
      },
      select: publicSelect,
    });
    await logAudit({ acao: "usuario:update", recurso: "User", recursoId: id, antes, depois: user });
    return NextResponse.json(user);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    return p2002(e) ?? NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("usuario:gerenciar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.user.deleteMany({ where: { id } });
    await logAudit({ acao: "usuario:delete", recurso: "User", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar usuário" }, { status: 500 });
  }
}
