import type { Prisma } from "@prisma/client";
import { num } from "@/lib/serialize";

export type Totais = {
  dinheiro: number;
  pix: number;
  cartao_debito: number;
  cartao_credito: number;
  geral: number;
};

/** Soma recebimentos por método (Decimal → number, 2 casas). */
export function totaisPorMetodo(recebimentos: { metodo: string; valor: Prisma.Decimal }[]): Totais {
  const t: Totais = { dinheiro: 0, pix: 0, cartao_debito: 0, cartao_credito: 0, geral: 0 };
  for (const r of recebimentos) {
    const v = num(r.valor);
    if (r.metodo in t) t[r.metodo as keyof Totais] += v;
    t.geral += v;
  }
  for (const k of Object.keys(t) as (keyof Totais)[]) t[k] = Math.round(t[k] * 100) / 100;
  return t;
}
