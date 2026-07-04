import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { ROLES } from "@/lib/rbac";

// Campos seguros p/ retorno — nunca inclui senhaHash.
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

const createSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z.string().optional(),
  matricula: z.string().optional(),
  telefone: z.string().optional(),
  papel: z.enum(ROLES),
  ativo: z.boolean().default(true),
  // Vínculo opcional com registro de domínio (portais).
  alunoId: z.coerce.number().int().positive().optional().nullable(),
  professorId: z.coerce.number().int().positive().optional().nullable(),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
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

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("usuario:gerenciar");
    if (guard instanceof NextResponse) return guard;

    const search = new URL(req.url).searchParams.get("search") ?? undefined;
    const where = search
      ? {
          OR: [
            { nome: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { cpf: { contains: search, mode: "insensitive" as const } },
            { matricula: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const data = await prisma.user.findMany({
      where,
      select: publicSelect,
      orderBy: { nome: "asc" },
    });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("usuario:gerenciar");
    if (guard instanceof NextResponse) return guard;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { senha, email, ...rest } = parsed.data;

    const user = await prisma.user.create({
      data: {
        ...rest,
        email: email.toLowerCase(),
        cpf: rest.cpf || null,
        matricula: rest.matricula || null,
        telefone: rest.telefone || null,
        alunoId: rest.alunoId ?? null,
        professorId: rest.professorId ?? null,
        senhaHash: await bcrypt.hash(senha, 10),
      },
      select: publicSelect,
    });
    await logAudit({ acao: "usuario:create", recurso: "User", recursoId: user.id, depois: user });
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    return p2002(e) ?? NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 });
  }
}
