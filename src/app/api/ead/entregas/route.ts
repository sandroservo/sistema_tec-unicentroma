import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";

const createSchema = z.object({
  aulaId: z.number().int(),
  texto: z.string().optional(),
  documentoId: z.string().optional(),
});

function dto(e: {
  id: number;
  aulaId: number;
  alunoId: number;
  texto: string | null;
  documentoId: string | null;
  nota: unknown;
  feedback: string | null;
  status: string;
  criadoEm: Date;
}) {
  return {
    id: e.id,
    aulaId: e.aulaId,
    alunoId: e.alunoId,
    texto: e.texto,
    documentoId: e.documentoId,
    nota: e.nota == null ? null : Number(e.nota),
    feedback: e.feedback,
    status: e.status,
    criadoEm: e.criadoEm,
  };
}

export async function GET(req: Request) {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;
  try {
    const sp = new URL(req.url).searchParams;
    const aulaId = sp.get("aulaId");
    if (!aulaId) return NextResponse.json({ error: "aulaId obrigatório" }, { status: 400 });
    const entrega = await prisma.entregaAtividade.findUnique({
      where: { aulaId_alunoId: { aulaId: parseInt(aulaId), alunoId: guard.alunoId } },
    });
    return NextResponse.json(entrega ? dto(entrega) : null);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar entrega" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const { aulaId, texto, documentoId } = parsed.data;
    const entrega = await prisma.entregaAtividade.upsert({
      where: { aulaId_alunoId: { aulaId, alunoId: guard.alunoId } },
      create: { aulaId, alunoId: guard.alunoId, texto: texto ?? null, documentoId: documentoId ?? null, status: "enviada" },
      update: { texto: texto ?? null, documentoId: documentoId ?? null, status: "enviada" },
    });
    return NextResponse.json(dto(entrega), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao enviar atividade" }, { status: 500 });
  }
}
