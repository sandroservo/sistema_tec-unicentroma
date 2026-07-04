"use client";

import { useState } from "react";
import { useListDisciplinas, useListCursos } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";

export default function DisciplinasList() {
  const [cursoId, setCursoId] = useState<any>("");

  const { data: disciplinas, isLoading } = useListDisciplinas({ cursoId: cursoId ? Number(cursoId) : undefined });
  const { pageItems, page, setPage, totalPages, total } = usePagination(disciplinas);
  const { data: cursos } = useListCursos({});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Disciplinas</h1>
          <p className="text-muted-foreground">Matriz curricular e disciplinas por curso.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm w-fit">
        <Select value={cursoId} onValueChange={setCursoId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Filtrar por curso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os cursos</SelectItem>
            {cursos?.map(c => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Disciplina</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Professor Padrão</TableHead>
              <TableHead className="text-center">Período</TableHead>
              <TableHead className="text-right">Carga Horária</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Carregando disciplinas...</TableCell>
              </TableRow>
            ) : disciplinas && disciplinas.length > 0 ? (
              pageItems.map((disc) => (
                <TableRow key={disc.id}>
                  <TableCell>
                    <div className="font-medium">{disc.nome}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">{disc.descricao || "-"}</div>
                  </TableCell>
                  <TableCell>{disc.cursoNome}</TableCell>
                  <TableCell>{disc.professorNome || "Não definido"}</TableCell>
                  <TableCell className="text-center">{(disc as { periodo?: number | null }).periodo ?? "-"}</TableCell>
                  <TableCell className="text-right">{disc.cargaHoraria}h</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhuma disciplina encontrada.
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
