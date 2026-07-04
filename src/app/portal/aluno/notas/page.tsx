"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Nota = { disciplinaNome: string; media: number | null; situacao: string };

const cor = (s: string) =>
  s === "Aprovado"
    ? "default"
    : s === "Reprovado"
      ? "destructive"
      : s === "Recuperação"
        ? "outline"
        : "secondary";

export default function NotasPage() {
  const { data, isLoading } = useQuery<Nota[]>({
    queryKey: ["portal-notas"],
    queryFn: () => fetch("/api/portal/aluno/notas").then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notas</h1>
        <p className="text-muted-foreground">Média ponderada por disciplina.</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Disciplina</TableHead>
              <TableHead className="text-right">Média</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : data?.length ? (
              data.map((n) => (
                <TableRow key={n.disciplinaNome}>
                  <TableCell className="font-medium">{n.disciplinaNome}</TableCell>
                  <TableCell className="text-right">{n.media != null ? n.media.toFixed(1) : "–"}</TableCell>
                  <TableCell>
                    <Badge variant={cor(n.situacao) as never}>{n.situacao}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Nenhuma nota lançada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
