import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, currentUser } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { saveFile } from "@/lib/storage";
import { permFor } from "@/lib/documentos";

export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024;
const MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const donoTipo = sp.get("donoTipo");
  const donoId = sp.get("donoId");
  if (!donoTipo || !donoId) {
    return NextResponse.json({ error: "donoTipo e donoId obrigatórios" }, { status: 400 });
  }
  const perm = permFor(donoTipo, "ler");
  if (!perm) return NextResponse.json({ error: "donoTipo inválido" }, { status: 400 });

  const guard = await requirePermission(perm);
  if (guard instanceof NextResponse) return guard;

  const docs = await prisma.documento.findMany({
    where: { donoTipo, donoId },
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json(docs);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const donoTipo = form.get("donoTipo");
  const donoId = form.get("donoId");
  const tipo = form.get("tipo");

  if (typeof donoTipo !== "string" || typeof donoId !== "string" || typeof tipo !== "string") {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  }

  const perm = permFor(donoTipo, "editar");
  if (!perm) return NextResponse.json({ error: "donoTipo inválido" }, { status: 400 });
  const guard = await requirePermission(perm);
  if (guard instanceof NextResponse) return guard;

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo excede 10MB" }, { status: 400 });
  }
  if (!MIMES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { path } = await saveFile(buffer, file.name);

  const user = await currentUser();
  const doc = await prisma.documento.create({
    data: {
      nome: file.name,
      tipo,
      path,
      mime: file.type,
      tamanho: file.size,
      donoTipo,
      donoId,
      uploadedById: user?.id ?? null,
    },
  });

  await logAudit({ acao: "documento:create", recurso: "Documento", recursoId: doc.id, depois: doc });
  return NextResponse.json(doc, { status: 201 });
}
