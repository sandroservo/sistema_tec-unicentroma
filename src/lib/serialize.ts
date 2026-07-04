import type { Prisma } from "@prisma/client";

type Dec = Prisma.Decimal | null;

/** Coluna `date` do Postgres → "YYYY-MM-DD" (igual ao backend Drizzle original). */
export function dateOnly(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** Decimal → number (usado onde o Express fazia parseFloat: cursos.valor, cobrancas.valor). */
export function num(d: Dec): number {
  return d == null ? 0 : Number(d);
}

/** Decimal → string preservando tipo string das notas (Drizzle numeric vinha como string). */
export function decStr(d: Dec): string | null {
  return d == null ? null : d.toString();
}

/** "YYYY-MM-DD" (ou ISO) → Date para colunas `date`. null-safe. */
export function toDate(s: string | null | undefined): Date | null {
  return s ? new Date(s) : null;
}
