import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const salaSchema = z.object({
  nome: z.string().min(1),
  bloco: z.string().optional().nullable(),
  capacidade: z.number().int().nonnegative(),
  tipo: z.enum(["sala", "laboratorio", "auditorio"]),
  recursos: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

export async function GET() {
  try {
    const guard = await requirePermission("sala:ler");
    if (guard instanceof NextResponse) return guard;
    const data = await prisma.sala.findMany({ orderBy: { nome: "asc" } });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar salas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requirePermission("sala:criar");
    if (guard instanceof NextResponse) return guard;

    const parsed = salaSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const sala = await prisma.sala.create({
      data: {
        nome: parsed.data.nome,
        bloco: parsed.data.bloco ?? null,
        capacidade: parsed.data.capacidade,
        tipo: parsed.data.tipo,
        recursos: parsed.data.recursos ?? null,
        ativo: parsed.data.ativo ?? true,
      },
    });
    await logAudit({ acao: "sala:create", recurso: "Sala", recursoId: sala.id, depois: sala });
    return NextResponse.json(sala, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar sala" }, { status: 500 });
  }
}
