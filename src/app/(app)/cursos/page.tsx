"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useListCursos, useDeleteCurso, getListCursosQueryKey } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2, Clock, MapPin } from "lucide-react";
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

export default function CursosList() {
  const [search, setSearch] = useState("");
  const [modalidade, setModalidade] = useState<any>("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: cursos, isLoading } = useListCursos({ search: search || undefined, modalidade: modalidade || undefined });
  const { pageItems, page, setPage, totalPages, total } = usePagination(cursos);
  const deleteCurso = useDeleteCurso();

  function excluir(id: number, nome: string) {
    deleteCurso.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListCursosQueryKey() });
          toast({ title: "Curso excluído", description: `${nome} foi removido.` });
        },
        onError: () => toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" }),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>
          <p className="text-muted-foreground">Catálogo de cursos oferecidos.</p>
        </div>
        <Button asChild>
          <Link href="/cursos/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo Curso
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cursos..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={modalidade} onValueChange={setModalidade}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Qualquer modalidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Qualquer modalidade</SelectItem>
            <SelectItem value="presencial">Presencial</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="hibrido">Híbrido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Carregando cursos...</div>
      ) : cursos && cursos.length > 0 ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pageItems.map((curso) => (
            <Card key={curso.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={curso.status === 'ativo' ? 'default' : 'secondary'}>{curso.status}</Badge>
                  <Badge variant="outline" className="capitalize">{curso.modalidade}</Badge>
                </div>
                <CardTitle className="line-clamp-1 text-xl">{curso.nome}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {curso.descricao || "Sem descrição."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-col gap-2 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {curso.cargaHoraria} horas
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {curso.area || "Geral"}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t pt-4">
                <div className="font-bold text-lg text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(curso.valor)}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" asChild title="Ver">
                    <Link href={`/cursos/${curso.id}`}>
                      <Eye className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild title="Editar">
                    <Link href={`/cursos/${curso.id}/editar`}>
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
                        <AlertDialogTitle>Excluir curso?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {curso.nome} será removido. Esta ação fica registrada na auditoria.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => excluir(curso.id, curso.nome)}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardFooter>
            </Card>
          ))}
          </div>
          <PaginationBar page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">
          Nenhum curso encontrado.
        </div>
      )}
    </div>
  );
}
