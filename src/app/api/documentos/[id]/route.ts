import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { readFile, deleteFile } from "@/lib/storage";
import { permFor } from "@/lib/documentos";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.documento.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  const perm = permFor(doc.donoTipo, "ler");
  if (!perm) return NextResponse.json({ error: "donoTipo inválido" }, { status: 400 });
  const guard = await requirePermission(perm);
  if (guard instanceof NextResponse) return guard;

  const buffer = await readFile(doc.path);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.nome)}"`,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.documento.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  const perm = permFor(doc.donoTipo, "editar");
  if (!perm) return NextResponse.json({ error: "donoTipo inválido" }, { status: 400 });
  const guard = await requirePermission(perm);
  if (guard instanceof NextResponse) return guard;

  await deleteFile(doc.path);
  await prisma.documento.delete({ where: { id } });
  await logAudit({ acao: "documento:delete", recurso: "Documento", recursoId: id, antes: doc });

  return new NextResponse(null, { status: 204 });
}
