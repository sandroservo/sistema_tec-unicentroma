// Rate limit simples por janela deslizante em memória.
// ponytail: por-instância (não compartilha entre réplicas). Trocar por Redis/DB se escalar horizontal.

const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec?: number } {
  const agora = Date.now();
  const desde = agora - windowMs;
  const arr = (hits.get(key) ?? []).filter((t) => t > desde);
  arr.push(agora);
  hits.set(key, arr);

  // limpeza preguiçosa para não crescer sem limite
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => t <= desde)) hits.delete(k);
  }

  if (arr.length > limit) {
    const maisAntigo = arr[0];
    return { ok: false, retryAfterSec: Math.ceil((maisAntigo + windowMs - agora) / 1000) };
  }
  return { ok: true };
}

/** IP do cliente a partir dos headers de proxy. */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconhecido"
  );
}
