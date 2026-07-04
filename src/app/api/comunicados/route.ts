import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { createNotificacao } from "@/lib/notify";
import { enviarWhatsapp } from "@/lib/integrations/evolution";
import { enviarEmail } from "@/lib/email";

export async function GET() {
  const guard = await requirePermission("comunicacao:enviar");
  if (guard instanceof NextResponse) return guard;

  const itens = await prisma.comunicado.findMany({
    orderBy: { criadoEm: "desc" },
    take: 50,
  });
  return NextResponse.json(itens);
}

const schema = z.object({
  titulo: z.string().min(1),
  mensagem: z.string().min(1),
  canal: z.enum(["notificacao", "whatsapp", "email"]),
  publico: z.enum(["todos_alunos", "inadimplentes"]),
});

export async function POST(req: Request) {
  const guard = await requirePermission("comunicacao:enviar");
  if (guard instanceof NextResponse) return guard;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", detalhes: parsed.error.flatten() }, { status: 400 });
  }
  const { titulo, mensagem, canal, publico } = parsed.data;

  // Resolve destinatários (ids de alunos).
  let alunoIds: number[];
  if (publico === "inadimplentes") {
    const parcelas = await prisma.parcela.findMany({
      where: { status: { in: ["pendente", "vencido"] }, vencimento: { lt: new Date() } },
      select: { contrato: { select: { alunoId: true } } },
    });
    alunoIds = [...new Set(parcelas.map((p) => p.contrato.alunoId))];
  } else {
    const alunos = await prisma.aluno.findMany({ where: { status: "ativo" }, select: { id: true } });
    alunoIds = alunos.map((a) => a.id);
  }

  const alunos = await prisma.aluno.findMany({
    where: { id: { in: alunoIds } },
    select: { id: true, email: true, telefone: true, usuario: { select: { id: true } } },
  });

  let enviados = 0;
  let falhas = 0;

  if (canal === "notificacao") {
    for (const a of alunos) {
      if (!a.usuario) {
        falhas++;
        continue;
      }
      await createNotificacao({ userId: a.usuario.id, titulo, mensagem, tipo: "info" });
      enviados++;
    }
  } else if (canal === "email") {
    for (const a of alunos) {
      if (!a.email) continue; // pula quem não tem e-mail
      const r = await enviarEmail({
        to: a.email,
        subject: titulo,
        html: `<h3>${titulo}</h3><p>${mensagem.replace(/\n/g, "<br>")}</p>`,
      });
      if (r.ok) enviados++;
      else falhas++;
    }
  } else {
    for (const a of alunos) {
      if (!a.telefone) continue; // pula quem não tem telefone
      const r = await enviarWhatsapp(a.telefone, `*${titulo}*\n\n${mensagem}`);
      if (r.ok) enviados++;
      else falhas++;
    }
  }

  const status = falhas > 0 ? (enviados > 0 ? "parcial" : "falhou") : "enviado";

  const comunicado = await prisma.comunicado.create({
    data: { titulo, mensagem, canal, destinatarios: enviados, status },
  });

  await logAudit({ acao: "comunicado:enviar", recurso: "Comunicado", recursoId: comunicado.id, depois: { canal, publico, enviados, falhas } });

  return NextResponse.json({ enviados, falhas, status });
}
