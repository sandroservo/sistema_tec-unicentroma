"use client";

// TODO: link no app-sidebar (Convênios)
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";

type Convenio = {
  id: number;
  nome: string;
  empresa: string | null;
  percentualDesconto: number;
  ativo: boolean;
};

function useListConvenios() {
  return useQuery<{ data: Convenio[] }>({
    queryKey: ["convenios"],
    queryFn: async () => {
      const res = await fetch("/api/convenios");
      if (!res.ok) throw new Error("Erro ao buscar convênios");
      return res.json();
    },
  });
}

export default function ConveniosList() {
  const { data, isLoading } = useListConvenios();
  const { pageItems, page, setPage, totalPages, total } = usePagination(data?.data);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Convênios</h1>
          <p className="text-muted-foreground">Gerencie os convênios e descontos.</p>
        </div>
        <Button asChild>
          <Link href="/convenios/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo convênio
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>% Desconto</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Carregando convênios...</TableCell>
              </TableRow>
            ) : data?.data && data.data.length > 0 ? (
              pageItems.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.empresa || "-"}</TableCell>
                  <TableCell>{c.percentualDesconto}%</TableCell>
                  <TableCell>
                    <Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "ativo" : "inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/convenios/${c.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhum convênio encontrado.
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
