import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";
import { logAudit } from "@/lib/audit";

const TIPOS = [
  "declaracao_matricula",
  "historico",
  "declaracao_conclusao",
  "segunda_via_boletim",
  "revisao_nota",
  "outro",
] as const;

export async function GET() {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;

  const data = await prisma.requerimento.findMany({
    where: { alunoId: guard.alunoId },
    select: {
      id: true,
      protocolo: true,
      tipo: true,
      descricao: true,
      status: true,
      resposta: true,
      criadoEm: true,
      atualizadoEm: true,
    },
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json(data);
}

const createSchema = z.object({
  tipo: z.enum(TIPOS),
  descricao: z.string().trim().max(2000).optional(),
});

function gerarProtocolo() {
  const ano = new Date().getFullYear();
  const n = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `REQ-${ano}-${n}`;
}

export async function POST(req: Request) {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // ponytail: até 5 tentativas contra colisão de protocolo (unique)
  for (let i = 0; i < 5; i++) {
    try {
      const r = await prisma.requerimento.create({
        data: {
          alunoId: guard.alunoId,
          protocolo: gerarProtocolo(),
          tipo: parsed.data.tipo,
          descricao: parsed.data.descricao ?? null,
          status: "aberto",
        },
        select: { id: true, protocolo: true },
      });
      await logAudit({
        acao: "requerimento:create",
        recurso: "Requerimento",
        recursoId: r.id,
        depois: r,
      });
      return NextResponse.json(r, { status: 201 });
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "P2002") continue;
      return NextResponse.json({ error: "Erro ao criar requerimento" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Não foi possível gerar protocolo" }, { status: 500 });
}
