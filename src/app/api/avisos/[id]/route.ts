import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const PUBLICOS = ["todos", "alunos", "professores", "responsaveis"] as const;

function avisoDTO(a: {
  id: number;
  titulo: string;
  conteudo: string;
  publico: string;
  fixado: boolean;
  ativo: boolean;
  autorUserId: string | null;
  expiraEm: Date | null;
  criadoEm: Date;
}) {
  return { ...a, expiraEm: dateOnly(a.expiraEm), criadoEm: a.criadoEm.toISOString() };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("aviso:ler");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const aviso = await prisma.aviso.findUnique({ where: { id: Number(id) } });
  if (!aviso) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(avisoDTO(aviso));
}

const patchSchema = z.object({
  titulo: z.string().trim().min(1).max(200).optional(),
  conteudo: z.string().trim().min(1).optional(),
  publico: z.enum(PUBLICOS).optional(),
  fixado: z.boolean().optional(),
  ativo: z.boolean().optional(),
  expiraEm: z.string().nullish(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("aviso:editar");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const antes = await prisma.aviso.findUnique({ where: { id: Number(id) } });
  if (!antes) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { expiraEm, ...rest } = parsed.data;
  const aviso = await prisma.aviso.update({
    where: { id: Number(id) },
    data: { ...rest, ...(expiraEm !== undefined ? { expiraEm: toDate(expiraEm) } : {}) },
  });
  await logAudit({ acao: "aviso:update", recurso: "Aviso", recursoId: aviso.id, antes: avisoDTO(antes), depois: avisoDTO(aviso) });
  return NextResponse.json(avisoDTO(aviso));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission("aviso:excluir");
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  const antes = await prisma.aviso.findUnique({ where: { id: Number(id) } });
  if (!antes) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.aviso.delete({ where: { id: Number(id) } });
  await logAudit({ acao: "aviso:delete", recurso: "Aviso", recursoId: Number(id), antes: avisoDTO(antes) });
  return NextResponse.json({ ok: true });
}
