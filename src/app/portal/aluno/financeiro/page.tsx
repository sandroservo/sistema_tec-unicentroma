"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Cobranca = {
  id: number;
  descricao: string;
  valor: number;
  vencimento: string | null;
  status: string;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const cor = (s: string) => (s === "pago" ? "default" : s === "atrasado" ? "destructive" : "secondary");

export default function FinanceiroPage() {
  const { data, isLoading } = useQuery<Cobranca[]>({
    queryKey: ["portal-financeiro"],
    queryFn: () => fetch("/api/portal/aluno/financeiro").then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">Suas cobranças.</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : data?.length ? (
              data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.descricao}</TableCell>
                  <TableCell className="text-right">{brl(c.valor)}</TableCell>
                  <TableCell>{c.vencimento}</TableCell>
                  <TableCell>
                    <Badge variant={cor(c.status) as never}>{c.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Nenhuma cobrança.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
