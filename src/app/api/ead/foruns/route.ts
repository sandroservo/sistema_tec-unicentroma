import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  cursoId: z.number().int(),
  titulo: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const sp = new URL(req.url).searchParams;
    const cursoId = sp.get("cursoId");
    const where = cursoId ? { cursoId: parseInt(cursoId) } : {};
    const data = await prisma.forum.findMany({ where, orderBy: { criadoEm: "desc" } });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar fóruns" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("ead:criar");
    if (guard instanceof NextResponse) return guard;
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const forum = await prisma.forum.create({ data: parsed.data });
    await logAudit({ acao: "forum:create", recurso: "Forum", recursoId: forum.id, depois: forum });
    return NextResponse.json(forum, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar fórum" }, { status: 500 });
  }
}
