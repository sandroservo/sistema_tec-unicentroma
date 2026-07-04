import "server-only";

const PIX_URL = process.env.PIX_PROVIDER_URL;
const PIX_KEY = process.env.PIX_PROVIDER_KEY;

export function pixConfigurado(): boolean {
  return Boolean(PIX_URL && PIX_KEY);
}

type CobrancaPix = {
  configurado: boolean;
  txid?: string;
  copiaECola?: string;
  qrCode?: string | null;
  status: string;
};

/** Gera cobrança PIX. Enquanto não há provedor real, retorna stub determinístico. */
export async function gerarCobrancaPix(input: {
  valor: number;
  descricao: string;
  vencimento?: string;
}): Promise<CobrancaPix> {
  if (!pixConfigurado()) {
    // ponytail: stub determinístico até plugar provedor real
    const txid = `STUB-${Math.round(input.valor * 100)}-${input.descricao.replace(/\W+/g, "").slice(0, 12)}`;
    return {
      configurado: false,
      status: "stub",
      txid,
      copiaECola: `00020126${txid}(stub)`,
      qrCode: null,
    };
  }

  // TODO: integrar provedor PIX real (ex: Efí/Gerencianet, Mercado Pago)
  return { configurado: true, status: "pendente" };
}
