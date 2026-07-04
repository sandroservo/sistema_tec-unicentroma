import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, currentUser } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  moduloId: z.number().int(),
  titulo: z.string().min(1),
  notaMinima: z.number().optional(),
});

function dto(q: { id: number; moduloId: number; titulo: string; notaMinima: unknown; criadoEm: Date }) {
  return {
    id: q.id,
    moduloId: q.moduloId,
    titulo: q.titulo,
    notaMinima: q.notaMinima == null ? null : Number(q.notaMinima),
    criadoEm: q.criadoEm,
  };
}

export async function GET(req: Request) {
  try {
    // Qualquer logado (aluno responde quiz no player; gabarito não está neste payload).
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const sp = new URL(req.url).searchParams;
    const moduloId = sp.get("moduloId");
    const where = moduloId ? { moduloId: parseInt(moduloId) } : {};
    const data = await prisma.questionario.findMany({ where, orderBy: { id: "asc" } });
    return NextResponse.json({ data: data.map(dto) });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar questionários" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("ead:criar");
    if (guard instanceof NextResponse) return guard;
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const q = await prisma.questionario.create({ data: parsed.data });
    await logAudit({ acao: "questionario:create", recurso: "Questionario", recursoId: q.id, depois: dto(q) });
    return NextResponse.json(dto(q), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar questionário" }, { status: 500 });
  }
}
