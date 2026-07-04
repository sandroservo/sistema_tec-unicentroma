// TODO: link no app-sidebar
"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";

type Sala = {
  id: number;
  nome: string;
  bloco: string | null;
  tipo: string;
  capacidade: number;
  ativo: boolean;
};

export default function SalasList() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Sala[]>({
    queryKey: ["salas"],
    queryFn: async () => {
      const res = await fetch("/api/salas");
      if (!res.ok) throw new Error("Erro ao buscar salas");
      return res.json();
    },
  });
  const { pageItems, page, setPage, totalPages, total } = usePagination(data);

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/salas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salas"] });
      toast({ title: "Sucesso", description: "Sala excluída." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível excluir a sala.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Salas</h1>
          <p className="text-muted-foreground">Gerencie as salas e laboratórios.</p>
        </div>
        <Button asChild>
          <Link href="/salas/novo">
            <Plus className="w-4 h-4 mr-2" />
            Nova sala
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Bloco</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Capacidade</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">Carregando salas...</TableCell>
              </TableRow>
            ) : data && data.length > 0 ? (
              pageItems.map((sala) => (
                <TableRow key={sala.id}>
                  <TableCell className="font-medium">{sala.nome}</TableCell>
                  <TableCell>{sala.bloco || "-"}</TableCell>
                  <TableCell><Badge variant="secondary">{sala.tipo}</Badge></TableCell>
                  <TableCell>{sala.capacidade}</TableCell>
                  <TableCell>
                    <Badge variant={sala.ativo ? "default" : "secondary"}>{sala.ativo ? "Sim" : "Não"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/salas/${sala.id}`}><Edit className="w-4 h-4" /></Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(sala.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Nenhuma sala encontrada.
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
