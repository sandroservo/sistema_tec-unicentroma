import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission, currentUser } from "@/lib/authz";
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

export async function GET() {
  const guard = await requirePermission("aviso:ler");
  if (guard instanceof NextResponse) return guard;

  const data = await prisma.aviso.findMany({
    orderBy: [{ fixado: "desc" }, { criadoEm: "desc" }],
  });
  return NextResponse.json(data.map(avisoDTO));
}

const createSchema = z.object({
  titulo: z.string().trim().min(1).max(200),
  conteudo: z.string().trim().min(1),
  publico: z.enum(PUBLICOS).default("todos"),
  fixado: z.boolean().optional(),
  ativo: z.boolean().optional(),
  expiraEm: z.string().nullish(),
});

export async function POST(req: Request) {
  const guard = await requirePermission("aviso:criar");
  if (guard instanceof NextResponse) return guard;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const user = await currentUser();
  const aviso = await prisma.aviso.create({
    data: {
      titulo: parsed.data.titulo,
      conteudo: parsed.data.conteudo,
      publico: parsed.data.publico,
      fixado: parsed.data.fixado ?? false,
      ativo: parsed.data.ativo ?? true,
      expiraEm: toDate(parsed.data.expiraEm),
      autorUserId: user?.id ?? null,
    },
  });
  await logAudit({ acao: "aviso:create", recurso: "Aviso", recursoId: aviso.id, depois: avisoDTO(aviso) });
  return NextResponse.json(avisoDTO(aviso), { status: 201 });
}
