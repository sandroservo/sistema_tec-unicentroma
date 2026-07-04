"use client";

import { useState } from "react";
import { useListNotas } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";

export default function NotasList() {
  const { data: notas, isLoading } = useListNotas({});
  const { pageItems, page, setPage, totalPages, total } = usePagination(notas);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notas</h1>
          <p className="text-muted-foreground">Acompanhamento do rendimento acadêmico.</p>
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Disciplina / Turma</TableHead>
              <TableHead className="text-center">Nota 1</TableHead>
              <TableHead className="text-center">Nota 2</TableHead>
              <TableHead className="text-center">Nota 3</TableHead>
              <TableHead className="text-center bg-muted/50">Média</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">Carregando notas...</TableCell>
              </TableRow>
            ) : notas && notas.length > 0 ? (
              pageItems.map((nota) => (
                <TableRow key={nota.id}>
                  <TableCell className="font-medium">{nota.alunoNome}</TableCell>
                  <TableCell>
                    <div>{nota.disciplinaNome}</div>
                  </TableCell>
                  <TableCell className="text-center">{nota.nota1 ?? "-"}</TableCell>
                  <TableCell className="text-center">{nota.nota2 ?? "-"}</TableCell>
                  <TableCell className="text-center">{nota.nota3 ?? "-"}</TableCell>
                  <TableCell className="text-center font-bold bg-muted/50">{nota.media ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={nota.situacao === 'aprovado' ? 'default' : nota.situacao === 'reprovado' ? 'destructive' : 'secondary'} className="capitalize">
                      {nota.situacao.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  Nenhuma nota registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationBar page={page} totalPages={totalPages} total={total} onChange={setPage} />
      </div>
    </div>
  );
}
