import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dateOnly, toDate } from "@/lib/serialize";
import { requirePermission, currentUser } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  alunoId: z.coerce.number().int(),
  tipo: z.enum(["advertencia", "elogio", "observacao", "suspensao"]),
  gravidade: z.enum(["baixa", "media", "alta"]).default("media"),
  descricao: z.string().min(1),
  data: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const guard = await requirePermission("ocorrencia:ler");
    if (guard instanceof NextResponse) return guard;

    const sp = new URL(req.url).searchParams;
    const where: Record<string, unknown> = {};
    const alunoId = sp.get("alunoId");
    const tipo = sp.get("tipo");
    if (alunoId) where.alunoId = parseInt(alunoId);
    if (tipo) where.tipo = tipo;

    const rows = await prisma.ocorrencia.findMany({
      where,
      orderBy: { data: "desc" },
      include: { aluno: { select: { nome: true } } },
    });

    return NextResponse.json({
      data: rows.map((o) => ({
        id: o.id,
        alunoId: o.alunoId,
        alunoNome: o.aluno.nome,
        tipo: o.tipo,
        gravidade: o.gravidade,
        descricao: o.descricao,
        data: dateOnly(o.data),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar ocorrências" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("ocorrencia:registrar");
    if (guard instanceof NextResponse) return guard;

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const b = parsed.data;

    const user = await currentUser();
    const o = await prisma.ocorrencia.create({
      data: {
        alunoId: b.alunoId,
        tipo: b.tipo,
        gravidade: b.gravidade,
        descricao: b.descricao,
        data: toDate(b.data)!,
        registradoPorUserId: user?.id ?? null,
      },
    });
    await logAudit({ acao: "ocorrencia:create", recurso: "Ocorrencia", recursoId: o.id, depois: o });
    return NextResponse.json({ ...o, data: dateOnly(o.data) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao registrar ocorrência" }, { status: 500 });
  }
}
