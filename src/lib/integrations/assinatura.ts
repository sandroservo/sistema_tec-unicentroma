import "server-only";

const ASS_URL = process.env.ASSINATURA_PROVIDER_URL;
const ASS_KEY = process.env.ASSINATURA_PROVIDER_KEY;

export function assinaturaConfigurado(): boolean {
  return Boolean(ASS_URL && ASS_KEY);
}

/** Solicita assinatura eletrônica de um documento. Stub até plugar provedor real. */
export async function solicitarAssinatura(input: {
  documentoNome: string;
  signatarioEmail: string;
}): Promise<{ configurado: boolean; status: string; urlAssinatura?: string }> {
  if (!assinaturaConfigurado()) {
    // ponytail: stub até plugar provedor real
    return { configurado: false, status: "stub", urlAssinatura: "https://exemplo/assinar/stub" };
  }

  // TODO: integrar provedor (ex: ZapSign, Clicksign, D4Sign)
  void input;
  return { configurado: true, status: "pendente" };
}
