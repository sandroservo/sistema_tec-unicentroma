"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useListAlunos, useDeleteAluno, getListAlunosQueryKey } from "@/lib/api-client";
import { PaginationBar } from "@/components/pagination-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// 11 dígitos -> 000.000.000-00 (mantém original se não tiver 11 dígitos)
function formatCpf(cpf?: string | null): string {
  const d = (cpf ?? "").replace(/\D/g, "");
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : (cpf ?? "-");
}

export default function AlunosList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<any>("");
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const { data, isLoading } = useListAlunos({ search: search || undefined, status: status || undefined, page, limit: 12 });
  const deleteAluno = useDeleteAluno();

  function excluir(id: number, nome: string) {
    deleteAluno.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListAlunosQueryKey() });
          toast({ title: "Aluno excluído", description: `${nome} foi removido (exclusão lógica).` });
        },
        onError: () => toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" }),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground">Gerencie os alunos da instituição.</p>
        </div>
        <Button asChild>
          <Link href="/alunos/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo Aluno
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="formado">Formado</SelectItem>
            <SelectItem value="trancado">Trancado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Email / Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Carregando alunos...</TableCell>
              </TableRow>
            ) : data?.data && data.data.length > 0 ? (
              data.data.map((aluno) => (
                <TableRow key={aluno.id}>
                  <TableCell className="font-medium">{aluno.nome}</TableCell>
                  <TableCell className="tabular-nums">{formatCpf(aluno.cpf)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{aluno.email}</span>
                      <span className="text-xs text-muted-foreground">{aluno.telefone || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={aluno.status === 'ativo' ? 'default' : 'secondary'}>
                      {aluno.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Ver">
                        <Link href={`/alunos/${aluno.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Editar">
                        <Link href={`/alunos/${aluno.id}/editar`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Excluir" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {aluno.nome} será marcado como excluído (exclusão lógica — o histórico é preservado e a ação fica registrada na auditoria).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => excluir(aluno.id, aluno.nome)}
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
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhum aluno encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationBar
          page={page}
          totalPages={Math.max(1, Math.ceil((data?.total ?? 0) / 12))}
          total={data?.total ?? 0}
          onChange={setPage}
        />
      </div>
    </div>
  );
}
