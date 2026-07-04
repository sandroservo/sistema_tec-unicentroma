"use client";

// TODO: link no app-sidebar (Contratos)

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";

type Contrato = {
  id: number;
  alunoId: number;
  alunoNome: string | null;
  valorTotal: number;
  numParcelas: number;
  status: string;
  resumoParcelas: { total: number; pagas: number; pendentes: number };
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ContratosList() {
  const { data, isLoading } = useQuery<Contrato[]>({
    queryKey: ["contratos"],
    queryFn: () => fetch("/api/contratos").then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">Contratos e mensalidades dos alunos.</p>
        </div>
        <Button asChild>
          <Link href="/contratos/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo contrato
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Valor total</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Pagas / Pendentes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">Carregando...</TableCell>
              </TableRow>
            ) : data && data.length > 0 ? (
              data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.alunoNome ?? `#${c.alunoId}`}</TableCell>
                  <TableCell>{brl(c.valorTotal)}</TableCell>
                  <TableCell>{c.numParcelas}x</TableCell>
                  <TableCell>
                    {c.resumoParcelas.pagas} / {c.resumoParcelas.pendentes}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.status === "ativo" ? "default" : "secondary"}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/contratos/${c.id}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Nenhum contrato encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
