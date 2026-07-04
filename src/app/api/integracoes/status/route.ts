import { NextResponse } from "next/server";
import { currentUser } from "@/lib/authz";
import { evolutionConfigurado } from "@/lib/integrations/evolution";
import { pixConfigurado } from "@/lib/integrations/banco";
import { assinaturaConfigurado } from "@/lib/integrations/assinatura";

/** Status das integrações — só booleans, nunca as chaves. Qualquer usuário logado. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  return NextResponse.json({
    evolution: evolutionConfigurado(),
    pix: pixConfigurado(),
    assinatura: assinaturaConfigurado(),
  });
}
