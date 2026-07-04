import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notaDTO } from "@/lib/dto";
import { decStr } from "@/lib/serialize";
import { calcularMedia, calcularSituacao } from "@/lib/notas";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("nota:lancar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const existing = await prisma.nota.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Nota não encontrada" }, { status: 404 });
    const body = await req.json();
    const n1 = body.nota1 != null ? String(body.nota1) : decStr(existing.nota1);
    const n2 = body.nota2 != null ? String(body.nota2) : decStr(existing.nota2);
    const n3 = body.nota3 != null ? String(body.nota3) : decStr(existing.nota3);
    const nf = body.notaFinal != null ? String(body.notaFinal) : decStr(existing.notaFinal);
    const media = calcularMedia(n1, n2, n3, nf);
    const situacao = calcularSituacao(media);
    const nota = await prisma.nota.update({
      where: { id: parseInt(id) },
      data: {
        nota1: n1,
        nota2: n2,
        nota3: n3,
        notaFinal: nf,
        media: media !== null ? String(media) : null,
        situacao,
      },
    });
    await logAudit({
      acao: "nota:update",
      recurso: "Nota",
      recursoId: nota.id,
      antes: notaDTO(existing),
      depois: notaDTO(nota),
    });
    return NextResponse.json(notaDTO(nota));
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar nota" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("nota:lancar");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await prisma.nota.deleteMany({ where: { id: parseInt(id) } });
    await logAudit({ acao: "nota:delete", recurso: "Nota", recursoId: id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Erro ao deletar nota" }, { status: 500 });
  }
}
