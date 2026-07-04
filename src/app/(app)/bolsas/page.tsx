"use client";

// TODO: link no app-sidebar (Bolsas)
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

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
              data.data.map((b) => (
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
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/bolsas/${b.id}`}>Ver</Link>
                    </Button>
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
    </div>
  );
}
