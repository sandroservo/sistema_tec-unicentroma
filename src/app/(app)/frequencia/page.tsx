"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Turma = { id: number; nome: string };
type Resumo = {
  alunoId: number; alunoNome: string; totalAulas: number;
  presencas: number; faltas: number; percentual: number; risco: boolean;
};

export default function FrequenciaPage() {
  const [turmaId, setTurmaId] = useState("");

  const { data: turmas } = useQuery<Turma[]>({
    queryKey: ["turmas"],
    queryFn: () => fetch("/api/turmas").then((r) => r.json()),
  });

  const { data: resumo, isLoading } = useQuery<Resumo[]>({
    queryKey: ["frequencia", turmaId],
    queryFn: () => fetch(`/api/turmas/${turmaId}/frequencia`).then((r) => r.json()),
    enabled: !!turmaId,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Frequência</h1>
        <p className="text-muted-foreground">Resumo de presença por aluno.</p>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <Select value={turmaId} onValueChange={setTurmaId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Selecione a turma" />
          </SelectTrigger>
          <SelectContent>
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
              <TableHead>Aluno</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Presenças</TableHead>
              <TableHead>Faltas</TableHead>
              <TableHead className="text-right">Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!turmaId ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Selecione uma turma.
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Carregando...</TableCell>
              </TableRow>
            ) : resumo && resumo.length > 0 ? (
              resumo.map((r) => (
                <TableRow key={r.alunoId}>
                  <TableCell className="font-medium">{r.alunoNome}</TableCell>
                  <TableCell>{r.percentual}% <span className="text-muted-foreground text-xs">({r.totalAulas} aulas)</span></TableCell>
                  <TableCell>{r.presencas}</TableCell>
                  <TableCell>{r.faltas}</TableCell>
                  <TableCell className="text-right">
                    {r.risco ? <Badge variant="destructive">Risco</Badge> : <Badge variant="default">OK</Badge>}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhum aluno ativo na turma.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
