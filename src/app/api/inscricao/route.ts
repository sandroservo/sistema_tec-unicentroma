import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as z from "zod";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const schema = z.object({
  processoId: z.coerce.number().int(),
  nome: z.string().min(2),
  cpf: z.string().min(11),
  email: z.string().email(),
  telefone: z.string().optional(),
  cursoPretendidoId: z.coerce.number().int().optional(),
});

// Público (sem auth): valida prazo/estado do processo antes de aceitar a inscrição.
export async function POST(req: Request) {
  try {
    // Anti-spam de inscrições públicas: 5 por IP a cada 60s.
    const rl = rateLimit(`inscricao:${clientIp(req)}`, 5, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas inscrições em pouco tempo. Aguarde um instante." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
      );
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    const b = parsed.data;

    const proc = await prisma.processoSeletivo.findUnique({ where: { id: b.processoId } });
    const hoje = new Date();
    if (!proc || proc.status !== "aberto" || proc.inscricaoInicio > hoje || proc.inscricaoFim < hoje) {
      return NextResponse.json({ error: "Inscrições não estão abertas para este processo" }, { status: 400 });
    }

    // TODO: pagamento da taxa (gateway) e upload de documentos
    const insc = await prisma.inscricao.create({
      data: {
        processoId: b.processoId,
        nome: b.nome,
        cpf: b.cpf,
        email: b.email,
        telefone: b.telefone ?? null,
        cursoPretendidoId: b.cursoPretendidoId ?? null,
        status: "inscrito",
        pagamentoStatus: "pendente",
      },
    });

    return NextResponse.json({
      ok: true,
      inscricaoId: insc.id,
      comprovante: { protocolo: insc.id, nome: insc.nome, processo: proc.nome },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao registrar inscrição" }, { status: 500 });
  }
}
