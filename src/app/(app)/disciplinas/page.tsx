"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useListDisciplinas, useListCursos, getListDisciplinasQueryKey } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Edit, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DisciplinasList() {
  const [cursoId, setCursoId] = useState<any>("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: disciplinas, isLoading } = useListDisciplinas({ cursoId: cursoId ? Number(cursoId) : undefined });
  const { pageItems, page, setPage, totalPages, total } = usePagination(disciplinas);
  const { data: cursos } = useListCursos({});

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/disciplinas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListDisciplinasQueryKey() });
      toast({ title: "Sucesso", description: "Disciplina excluída." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível excluir a disciplina.", variant: "destructive" }),
  });

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
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">Carregando disciplinas...</TableCell>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Visualizar">
                        <Link href={`/disciplinas/${disc.id}`}><Eye className="w-4 h-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Editar">
                        <Link href={`/disciplinas/${disc.id}/editar`}><Edit className="w-4 h-4" /></Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Excluir" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir disciplina?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {disc.nome} será removida. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => remove.mutate(disc.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
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
