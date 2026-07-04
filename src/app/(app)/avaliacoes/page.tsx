// TODO: link no app-sidebar (Avaliações)
"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

type Turma = { id: number; nome: string };
type Disciplina = { id: number; nome: string };
type Avaliacao = {
  id: number; turmaNome: string | null; disciplinaNome: string | null;
  tipo: string; descricao: string | null; peso: number; data: string | null;
};

const fetchJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro ao carregar");
  return res.json();
};

export default function AvaliacoesList() {
  const [turmaId, setTurmaId] = useState<string>("");
  const [disciplinaId, setDisciplinaId] = useState<string>("");

  const { data: turmas } = useQuery<Turma[]>({ queryKey: ["turmas"], queryFn: () => fetchJson("/api/turmas") });
  const { data: disciplinas } = useQuery<Disciplina[]>({ queryKey: ["disciplinas"], queryFn: () => fetchJson("/api/disciplinas") });

  const qs = new URLSearchParams();
  if (turmaId) qs.set("turmaId", turmaId);
  if (disciplinaId) qs.set("disciplinaId", disciplinaId);
  const { data, isLoading } = useQuery<Avaliacao[]>({
    queryKey: ["avaliacoes", turmaId, disciplinaId],
    queryFn: () => fetchJson(`/api/avaliacoes?${qs.toString()}`),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Avaliações</h1>
          <p className="text-muted-foreground">Gerencie avaliações e lance notas.</p>
        </div>
        <Button asChild>
          <Link href="/avaliacoes/novo">
            <Plus className="w-4 h-4 mr-2" />
            Nova avaliação
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <Select value={turmaId} onValueChange={(v) => setTurmaId(v === "todas" ? "" : v)}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todas as turmas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as turmas</SelectItem>
            {turmas?.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={disciplinaId} onValueChange={(v) => setDisciplinaId(v === "todas" ? "" : v)}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todas as disciplinas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as disciplinas</SelectItem>
            {disciplinas?.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Turma / Disciplina</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center h-24">Carregando...</TableCell></TableRow>
            ) : data && data.length > 0 ? (
              data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell><Badge variant="secondary">{a.tipo}</Badge></TableCell>
                  <TableCell className="font-medium">{a.descricao || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{a.turmaNome ?? "-"}</span>
                      <span className="text-xs text-muted-foreground">{a.disciplinaNome ?? "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{a.peso}</TableCell>
                  <TableCell>{a.data ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/avaliacoes/${a.id}`}>Lançar notas</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nenhuma avaliação encontrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
