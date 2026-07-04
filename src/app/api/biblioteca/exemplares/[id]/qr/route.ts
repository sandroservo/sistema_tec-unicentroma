import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission("biblioteca:ler");
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    const exemplar = await prisma.exemplar.findUnique({ where: { id: parseInt(id) } });
    if (!exemplar) return NextResponse.json({ error: "Exemplar não encontrado" }, { status: 404 });

    const buf = await QRCode.toBuffer(exemplar.codigo);
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "image/png" } });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar QR Code" }, { status: 500 });
  }
}
