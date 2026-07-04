/** Período dos relatórios: ?de=&ate= (YYYY-MM-DD); default últimos 12 meses. `ate` inclusivo. */
export function periodo(sp: URLSearchParams) {
  const ateStr = sp.get("ate");
  const ate = ateStr ? new Date(`${ateStr}T23:59:59.999Z`) : new Date();
  const deStr = sp.get("de");
  const de = deStr ? new Date(`${deStr}T00:00:00.000Z`) : new Date(Date.UTC(ate.getUTCFullYear() - 1, ate.getUTCMonth(), ate.getUTCDate()));
  return { de, ate };
}

export const LIMITE_LINHAS = 1000;
