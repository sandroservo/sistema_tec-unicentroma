"use client";

// TODO: link no app-sidebar (já existe)

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, CheckCircle } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";

type Conta = {
  id: number;
  descricao: string;
  valor: number;
  vencimento: string | null;
  dataPagamento: string | null;
  status: string;
  fornecedor: string | null;
  planoContaNome: string | null;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" =>
  s === "pago" ? "default" : s === "vencido" ? "destructive" : s === "cancelado" ? "outline" : "secondary";

export default function ContasPagarList() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("todos");
  const [pagar, setPagar] = useState<Conta | null>(null);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery<Conta[]>({
    queryKey: ["contas-pagar", status],
    queryFn: () =>
      fetch(`/api/contas-pagar${status !== "todos" ? `?status=${status}` : ""}`).then((r) => r.json()),
  });
  const { pageItems, page, setPage, totalPages, total } = usePagination(data);

  const baixar = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/contas-pagar/${pagar!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pago", dataPagamento }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      toast({ title: "Sucesso", description: "Conta baixada como paga." });
      setPagar(null);
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível baixar a conta.", variant: "destructive" }),
  });

  const excluir = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/contas-pagar/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      toast({ title: "Excluída", description: "Conta removida." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" }),
  });

  const mesAtual = new Date().toISOString().slice(0, 7);
  const totalPendente = (data ?? [])
    .filter((c) => c.status === "pendente" || c.status === "vencido")
    .reduce((s, c) => s + c.valor, 0);
  const pagoNoMes = (data ?? [])
    .filter((c) => c.status === "pago" && c.dataPagamento?.startsWith(mesAtual))
    .reduce((s, c) => s + c.valor, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas a Pagar</h1>
          <p className="text-muted-foreground">Despesas e obrigações da instituição.</p>
        </div>
        <Button asChild>
          <Link href="/contas-pagar/nova">
            <Plus className="w-4 h-4 mr-2" />
            Nova conta
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <span className="text-sm text-muted-foreground">A pagar (pendente + vencido)</span>
            <h4 className="mt-1 text-2xl font-semibold tracking-tight text-destructive">{brl(totalPendente)}</h4>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <span className="text-sm text-muted-foreground">Pago no mês</span>
            <h4 className="mt-1 text-2xl font-semibold tracking-tight">{brl(pagoNoMes)}</h4>
          </CardContent>
        </Card>
      </div>

      <div className="w-56">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">Carregando...</TableCell>
              </TableRow>
            ) : data && data.length > 0 ? (
              pageItems.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.descricao}</TableCell>
                  <TableCell>{c.fornecedor ?? "—"}</TableCell>
                  <TableCell>{c.planoContaNome ?? "—"}</TableCell>
                  <TableCell>{brl(c.valor)}</TableCell>
                  <TableCell>{c.vencimento ? new Date(c.vencimento).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.status !== "pago" && c.status !== "cancelado" && (
                      <Button variant="ghost" size="icon" onClick={() => { setPagar(c); setDataPagamento(new Date().toISOString().slice(0, 10)); }} title="Pagar">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => excluir.mutate(c.id)} title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  Nenhuma conta encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onChange={setPage} />

      <Dialog open={!!pagar} onOpenChange={(o) => !o && setPagar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Baixar conta</DialogTitle>
            <DialogDescription>{pagar?.descricao} — {pagar ? brl(pagar.valor) : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Data do pagamento</label>
            <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagar(null)}>Cancelar</Button>
            <Button onClick={() => baixar.mutate()} disabled={baixar.isPending}>Confirmar pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
