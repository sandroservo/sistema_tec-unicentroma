"use client";

// TODO: link no app-sidebar (Bolsas)
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
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

type Bolsa = {
  id: number;
  alunoNome?: string;
  tipo: string;
  percentual: number;
  dataInicio: string | null;
  dataFim: string | null;
  ativo: boolean;
};

function useListBolsas() {
  return useQuery<{ data: Bolsa[] }>({
    queryKey: ["bolsas"],
    queryFn: async () => {
      const res = await fetch("/api/bolsas");
      if (!res.ok) throw new Error("Erro ao buscar bolsas");
      return res.json();
    },
  });
}

export default function BolsasList() {
  const { data, isLoading } = useListBolsas();
  const { pageItems, page, setPage, totalPages, total } = usePagination(data?.data);
  const { toast } = useToast();
  const qc = useQueryClient();

  async function excluir(id: number) {
    const res = await fetch(`/api/bolsas/${id}`, { method: "DELETE" });
    if (res.ok) {
      qc.invalidateQueries({ queryKey: ["bolsas"] });
      toast({ title: "Bolsa excluída" });
    } else {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bolsas</h1>
          <p className="text-muted-foreground">Gerencie as bolsas de estudo dos alunos.</p>
        </div>
        <Button asChild>
          <Link href="/bolsas/novo">
            <Plus className="w-4 h-4 mr-2" />
            Nova bolsa
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Percentual</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">Carregando bolsas...</TableCell>
              </TableRow>
            ) : data?.data && data.data.length > 0 ? (
              pageItems.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.alunoNome ?? b.id}</TableCell>
                  <TableCell className="capitalize">{b.tipo}</TableCell>
                  <TableCell>{b.percentual}%</TableCell>
                  <TableCell>
                    {b.dataInicio} {b.dataFim ? `→ ${b.dataFim}` : "→ —"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.ativo ? "default" : "secondary"}>{b.ativo ? "ativo" : "inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Visualizar">
                        <Link href={`/bolsas/${b.id}`}><Eye className="w-4 h-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Editar">
                        <Link href={`/bolsas/${b.id}/editar`}><Edit className="w-4 h-4" /></Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Excluir" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir bolsa?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A bolsa de {b.alunoNome ?? "aluno"} será removida. Ação irreversível.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => excluir(b.id)}
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
                  Nenhuma bolsa encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onChange={setPage} />
    </div>
  );
}
