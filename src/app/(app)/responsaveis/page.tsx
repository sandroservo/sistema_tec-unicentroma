"use client";

// TODO: link no app-sidebar (já existe link, ignore)

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Edit } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";

type Responsavel = { id: number; nome: string; email: string; parentesco: string; numAlunos: number };

const PARENTESCO: Record<string, string> = { pai: "Pai", mae: "Mãe", responsavel: "Responsável" };

export default function ResponsaveisList() {
  const { data, isLoading } = useQuery<Responsavel[]>({
    queryKey: ["responsaveis"],
    queryFn: () => fetch("/api/responsaveis").then((r) => r.json()),
  });
  const { pageItems, page, setPage, totalPages, total } = usePagination(data);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Responsáveis</h1>
          <p className="text-muted-foreground">Pais e responsáveis com acesso ao portal.</p>
        </div>
        <Button asChild>
          <Link href="/responsaveis/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo responsável
          </Link>
        </Button>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Parentesco</TableHead>
              <TableHead className="text-right">Alunos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : data?.length ? (
              pageItems.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{PARENTESCO[r.parentesco] ?? r.parentesco}</TableCell>
                  <TableCell className="text-right">{r.numAlunos}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Visualizar">
                        <Link href={`/responsaveis/${r.id}`}><Eye className="w-4 h-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Editar">
                        <Link href={`/responsaveis/${r.id}/editar`}><Edit className="w-4 h-4" /></Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum responsável cadastrado.
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
