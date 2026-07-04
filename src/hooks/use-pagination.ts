"use client";

import { useMemo, useState } from "react";

export const PAGE_SIZE = 12;

/**
 * Paginação client-side padrão (12/página).
 * Reseta para a página 1 automaticamente quando a lista encolhe abaixo da página atual.
 */
export function usePagination<T>(items: T[] | undefined, pageSize: number = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => (items ?? []).slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return { pageItems, page: safePage, setPage, totalPages, total };
}
