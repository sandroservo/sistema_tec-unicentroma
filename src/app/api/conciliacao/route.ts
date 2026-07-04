import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";

// TODO: importar OFX / API bancária.
export async function POST() {
  const guard = await requirePermission("cobranca:editar");
  if (guard instanceof NextResponse) return guard;

  return NextResponse.json(
    {
      status: "nao_configurado",
      mensagem: "Conciliação bancária requer integração com API do banco/OFX.",
    },
    { status: 501 },
  );
}
