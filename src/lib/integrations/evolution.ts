import "server-only";

const URL = process.env.EVOLUTION_API_URL;
const KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE = process.env.EVOLUTION_INSTANCE;

/** true se as 3 envs da Evolution API estão definidas. */
export function evolutionConfigurado(): boolean {
  return Boolean(URL && KEY && INSTANCE);
}

/** Normaliza número: só dígitos, com DDI 55 se faltar. */
function sanitizeNumero(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

/** Envia mensagem de texto via Evolution API. No-op controlado se não configurado. */
export async function enviarWhatsapp(
  numero: string,
  texto: string,
): Promise<{ ok: boolean; erro?: string }> {
  if (!evolutionConfigurado()) return { ok: false, erro: "Evolution não configurado" };

  try {
    const res = await fetch(`${URL}/message/sendText/${INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY! },
      body: JSON.stringify({ number: sanitizeNumero(numero), text: texto }),
    });
    if (!res.ok) return { ok: false, erro: `Evolution HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao enviar" };
  }
}
