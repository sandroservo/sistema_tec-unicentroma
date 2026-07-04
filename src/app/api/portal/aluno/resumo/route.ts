import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAluno } from "@/lib/portal";
import { dateOnly, num } from "@/lib/serialize";
import { mediasPorDisciplina, turmaIdsDoAluno } from "../_media";

export async function GET() {
  const guard = await requireAluno();
  if (guard instanceof NextResponse) return guard;
  const { alunoId } = guard;

  const [matriculasAtivas, medias, turmaIds, cobrancas] = await Promise.all([
    prisma.matricula.count({ where: { alunoId, status: "ativa" } }),
    mediasPorDisciplina(alunoId),
    turmaIdsDoAluno(alunoId),
    prisma.cobranca.findMany({ where: { alunoId }, select: { valor: true, status: true } }),
  ]);

  const comMedia = medias.filter((m) => m.media != null) as { media: number }[];
  const mediaGeral = comMedia.length ? comMedia.reduce((s, m) => s + m.media, 0) / comMedia.length : null;

  let totalPresencas = 0;
  let presentes = 0;
  if (turmaIds.length) {
    const presencas = await prisma.presenca.findMany({
      where: { alunoId, aula: { turmaId: { in: turmaIds } } },
      select: { status: true },
    });
    totalPresencas = presencas.length;
    presentes = presencas.filter((p) => p.status !== "falta").length;
  }
  const frequenciaGeral = totalPresencas > 0 ? (presentes / totalPresencas) * 100 : null;

  const saldoDevedor = cobrancas
    .filter((c) => c.status !== "pago")
    .reduce((s, c) => s + num(c.valor), 0);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const eventos = await prisma.calendarioEvento.findMany({
    where: { dataInicio: { gte: hoje } },
    orderBy: { dataInicio: "asc" },
    take: 5,
  });
  const proximosEventos = eventos.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    tipo: e.tipo,
    dataInicio: dateOnly(e.dataInicio),
  }));

  return NextResponse.json({ mediaGeral, frequenciaGeral, saldoDevedor, matriculasAtivas, proximosEventos });
}
