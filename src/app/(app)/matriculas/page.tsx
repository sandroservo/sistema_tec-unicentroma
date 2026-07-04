"use client";

import { useState } from "react";
import { useListMatriculas } from "@/lib/api-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";

export default function MatriculasList() {
  const [status, setStatus] = useState<any>("");

  const { data: matriculas, isLoading } = useListMatriculas({ status: status || undefined });
  const { pageItems, page, setPage, totalPages, total } = usePagination(matriculas);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matrículas</h1>
          <p className="text-muted-foreground">Gestão de matrículas dos alunos.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm w-fit">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="trancada">Trancada</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead>Turma / Curso</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">Carregando matrículas...</TableCell>
              </TableRow>
            ) : matriculas && matriculas.length > 0 ? (
              pageItems.map((mat) => (
                <TableRow key={mat.id}>
                  <TableCell>
                    {new Date(mat.dataMatricula).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Link href={`/alunos/${mat.alunoId}`} className="font-medium text-primary hover:underline">
                      {mat.alunoNome}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{mat.turmaNome}</div>
                    <div className="text-xs text-muted-foreground">{mat.cursoNome}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={mat.status === 'ativa' ? 'default' : mat.status === 'concluida' ? 'secondary' : 'destructive'}>
                      {mat.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  Nenhuma matrícula encontrada.
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
