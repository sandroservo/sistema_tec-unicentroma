import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";

// TODO: integrar provedor NF-e (ex: Focus/NFe.io).
export async function POST(req: Request) {
  const guard = await requirePermission("cobranca:editar");
  if (guard instanceof NextResponse) return guard;

  await req.json().catch(() => ({})); // { parcelaId } — ignorado até integração.

  return NextResponse.json(
    {
      status: "nao_configurado",
      mensagem: "Emissão de NF-e requer provedor externo (ex: Focus/NFe.io).",
    },
    { status: 501 },
  );
}
