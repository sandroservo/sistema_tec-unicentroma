import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("aluno:editar");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  const responsavel = await prisma.responsavel.findUnique({
    where: { id: Number(id) },
    include: { alunos: { select: { id: true, nome: true } } },
  });
  if (!responsavel) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(responsavel);
}

const patchSchema = z.object({
  nome: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  cpf: z.string().trim().min(1).nullable().optional(),
  telefone: z.string().trim().min(1).nullable().optional(),
  parentesco: z.enum(["pai", "mae", "responsavel"]).optional(),
  alunoIds: z.array(z.number().int()).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("aluno:editar");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { alunoIds, ...rest } = parsed.data;

  try {
    const responsavel = await prisma.responsavel.update({
      where: { id: Number(id) },
      data: {
        ...rest,
        ...(alunoIds ? { alunos: { set: alunoIds.map((aid) => ({ id: aid })) } } : {}),
      },
    });
    await logAudit({ acao: "responsavel:update", recurso: "Responsavel", recursoId: responsavel.id, depois: responsavel });
    return NextResponse.json(responsavel);
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002")
      return NextResponse.json({ error: "Email ou CPF já cadastrado" }, { status: 409 });
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao atualizar responsável" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("aluno:editar");
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  const rid = Number(id);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({ where: { responsavelId: rid } });
      await tx.responsavel.delete({ where: { id: rid } });
    });
    await logAudit({ acao: "responsavel:delete", recurso: "Responsavel", recursoId: rid });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2025")
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao remover responsável" }, { status: 500 });
  }
}
