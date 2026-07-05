"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useListTurmas, useDeleteTurma, getListTurmasQueryKey } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
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

export default function TurmasList() {
  const [status, setStatus] = useState<any>("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: turmas, isLoading } = useListTurmas({ status: status || undefined });
  const { pageItems, page, setPage, totalPages, total } = usePagination(turmas);
  const deleteTurma = useDeleteTurma();

  function excluir(id: number) {
    deleteTurma.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListTurmasQueryKey() });
          toast({ title: "Turma excluída" });
        },
        onError: () => toast({ title: "Erro", description: "Não foi possível excluir (verifique matrículas vinculadas).", variant: "destructive" }),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Turmas</h1>
          <p className="text-muted-foreground">Gestão de turmas e vagas.</p>
        </div>
        <Button asChild>
          <Link href="/turmas/novo">
            <Plus className="w-4 h-4 mr-2" />
            Nova Turma
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm w-fit">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="planejada">Planejada</SelectItem>
            <SelectItem value="encerrada">Encerrada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Turma / Curso</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="w-[200px]">Ocupação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">Carregando turmas...</TableCell>
              </TableRow>
            ) : turmas && turmas.length > 0 ? (
              pageItems.map((turma) => (
                <TableRow key={turma.id}>
                  <TableCell>
                    <div className="font-medium">{turma.nome}</div>
                    <div className="text-xs text-muted-foreground">{turma.cursoNome}</div>
                  </TableCell>
                  <TableCell>{turma.professorNome || "Não definido"}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(turma.dataInicio).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-xs text-muted-foreground">{turma.horario || "-"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>{turma.vagasOcupadas} de {turma.vagas}</span>
                        <span>{Math.round((turma.vagasOcupadas / turma.vagas) * 100)}%</span>
                      </div>
                      <Progress value={(turma.vagasOcupadas / turma.vagas) * 100} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={turma.status === 'em_andamento' ? 'default' : 'secondary'}>
                      {turma.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Visualizar">
                        <Link href={`/turmas/${turma.id}`}><Eye className="w-4 h-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Editar">
                        <Link href={`/turmas/${turma.id}/editar`}><Edit className="w-4 h-4" /></Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Excluir" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir turma?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {turma.nome} será removida. Turmas com matrículas vinculadas não podem ser excluídas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => excluir(turma.id)}
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
                  Nenhuma turma encontrada.
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
