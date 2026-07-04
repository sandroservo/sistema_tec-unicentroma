// TODO: links no app-sidebar (Diário, Frequência)
"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

type Turma = { id: number; nome: string };
type Aula = {
  id: number; data: string; turmaNome: string | null; disciplinaNome: string | null; conteudo: string;
};

export default function DiarioList() {
  const [turmaId, setTurmaId] = useState("");

  const { data: turmas } = useQuery<Turma[]>({
    queryKey: ["turmas"],
    queryFn: () => fetch("/api/turmas").then((r) => r.json()),
  });

  const { data: aulas, isLoading } = useQuery<Aula[]>({
    queryKey: ["aulas", turmaId],
    queryFn: () =>
      fetch(`/api/aulas${turmaId ? `?turmaId=${turmaId}` : ""}`).then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Diário Eletrônico</h1>
          <p className="text-muted-foreground">Registro de aulas ministradas.</p>
        </div>
        <Button asChild>
          <Link href="/diario/novo">
            <Plus className="w-4 h-4 mr-2" />
            Registrar aula
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <Select value={turmaId} onValueChange={(v) => setTurmaId(v === "todas" ? "" : v)}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Todas as turmas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as turmas</SelectItem>
            {turmas?.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead>Conteúdo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Carregando aulas...</TableCell>
              </TableRow>
            ) : aulas && aulas.length > 0 ? (
              aulas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.data}</TableCell>
                  <TableCell className="font-medium">{a.turmaNome}</TableCell>
                  <TableCell>{a.disciplinaNome}</TableCell>
                  <TableCell className="max-w-md truncate">{a.conteudo}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/diario/${a.id}`}>Chamada</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhuma aula registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
