"use client";

// TODO: link no app-sidebar (Processo Seletivo)
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";

type Processo = {
  id: number;
  nome: string;
  vagas: number;
  inscricaoInicio: string | null;
  inscricaoFim: string | null;
  status: string;
  totalInscricoes?: number;
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  aberto: "default",
  encerrado: "secondary",
  resultado: "outline",
};

export default function SelecaoList() {
  const { data, isLoading } = useQuery({
    queryKey: ["selecao"],
    queryFn: async (): Promise<{ data: Processo[] }> => {
      const res = await fetch("/api/selecao");
      if (!res.ok) throw new Error("Erro ao carregar");
      return res.json();
    },
  });
  const { pageItems, page, setPage, totalPages, total } = usePagination(data?.data);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Processo Seletivo</h1>
          <p className="text-muted-foreground">Gerencie os processos seletivos da instituição.</p>
        </div>
        <Button asChild>
          <Link href="/selecao/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo processo
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Período de inscrição</TableHead>
              <TableHead>Vagas</TableHead>
              <TableHead>Inscritos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">Carregando...</TableCell>
              </TableRow>
            ) : data?.data && data.data.length > 0 ? (
              pageItems.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>{p.inscricaoInicio} — {p.inscricaoFim}</TableCell>
                  <TableCell>{p.vagas}</TableCell>
                  <TableCell>{p.totalInscricoes ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[p.status] ?? "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/selecao/${p.id}`}><Eye className="w-4 h-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Nenhum processo cadastrado.
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
