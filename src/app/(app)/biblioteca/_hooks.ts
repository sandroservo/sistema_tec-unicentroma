"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Erro na requisição");
  return res.status === 204 ? (undefined as T) : res.json();
}

// ── Tipos leves ──────────────────────────────────────────────
export type Titulo = {
  id: number;
  titulo: string;
  autor: string | null;
  isbn: string | null;
  editora: string | null;
  ano: number | null;
  categoria: string | null;
  totalExemplares?: number;
  disponiveis?: number;
};
export type Exemplar = {
  id: number;
  tituloId: number;
  codigo: string;
  status: string;
  localizacao: string | null;
};
export type TituloDetalhe = Titulo & { exemplares: Exemplar[] };
export type Emprestimo = {
  id: number;
  alunoNome: string;
  tituloNome: string;
  exemplarCodigo: string;
  dataEmprestimo: string | null;
  dataPrevista: string | null;
  dataDevolucao: string | null;
  status: string;
  multa: { id: number; valor: number; paga: boolean } | null;
};
export type AlunoLite = { id: number; nome: string };

// ── Queries ──────────────────────────────────────────────────
export function useTitulos(search?: string) {
  return useQuery({
    queryKey: ["biblioteca", "titulos", search ?? ""],
    queryFn: () =>
      jsonFetch<{ data: Titulo[] }>(`/api/biblioteca/titulos${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });
}

export function useTitulo(id: number) {
  return useQuery({
    queryKey: ["biblioteca", "titulo", id],
    queryFn: () => jsonFetch<TituloDetalhe>(`/api/biblioteca/titulos/${id}`),
    enabled: !!id,
  });
}

export function useEmprestimos(status?: string) {
  return useQuery({
    queryKey: ["biblioteca", "emprestimos", status ?? ""],
    queryFn: () =>
      jsonFetch<{ data: Emprestimo[] }>(`/api/biblioteca/emprestimos${status ? `?status=${status}` : ""}`),
  });
}

export function useAlunos() {
  return useQuery({
    queryKey: ["alunos", "select"],
    queryFn: () => jsonFetch<{ data: AlunoLite[] }>(`/api/alunos?limit=100`),
  });
}

// ── Mutations ────────────────────────────────────────────────
export function useCreateTitulo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Titulo>) =>
      jsonFetch<Titulo>(`/api/biblioteca/titulos`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biblioteca", "titulos"] }),
  });
}

export function useCreateExemplar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { tituloId: number; localizacao?: string; codigo?: string }) =>
      jsonFetch<Exemplar>(`/api/biblioteca/exemplares`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["biblioteca", "titulo", v.tituloId] }),
  });
}

export function useEmprestar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { exemplarId: number; alunoId: number; prazoDias?: number }) =>
      jsonFetch(`/api/biblioteca/emprestimos`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biblioteca"] }),
  });
}

export function useDevolver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      jsonFetch<{ devolvido: unknown; multa?: { valor: number } }>(
        `/api/biblioteca/emprestimos/${id}/devolver`,
        { method: "POST", body: JSON.stringify({}) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biblioteca"] }),
  });
}

export function useReservar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { tituloId: number; alunoId: number }) =>
      jsonFetch(`/api/biblioteca/reservas`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biblioteca"] }),
  });
}

export function usePagarMulta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      jsonFetch(`/api/biblioteca/multas/${id}`, { method: "PATCH", body: JSON.stringify({ paga: true }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biblioteca"] }),
  });
}
