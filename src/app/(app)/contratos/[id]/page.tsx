"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";

type Parcela = {
  id: number;
  numero: number;
  valor: number;
  vencimento: string | null;
  dataPagamento: string | null;
  status: string;
  metodoPagamento: string | null;
};
type Contrato = {
  id: number;
  alunoNome: string | null;
  valorTotal: number;
  numParcelas: number;
  diaVencimento: number;
  dataInicio: string | null;
  descontoPercentual: number;
  status: string;
  observacoes: string | null;
  parcelas: Parcela[];
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const badgeVariant = (s: string) => (s === "pago" ? "default" : s === "vencido" ? "destructive" : "secondary");

function RegistrarPagamento({ parcela, onDone }: { parcela: Parcela; onDone: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [metodo, setMetodo] = useState("pix");

  const pagar = useMutation({
    mutationFn: () =>
      fetch(`/api/parcelas/${parcela.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pago", metodoPagamento: metodo }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Erro");
        return r.json();
      }),
    onSuccess: () => {
      toast({ title: "Pagamento registrado", description: `Parcela ${parcela.numero}` });
      setOpen(false);
      onDone();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Registrar pagamento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento — parcela {parcela.numero}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Valor: {brl(parcela.valor)}</p>
          <Select value={metodo} onValueChange={setMetodo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
              <SelectItem value="cartao">Cartão</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button onClick={() => pagar.mutate()} disabled={pagar.isPending}>
            {pagar.isPending ? "Salvando..." : "Confirmar pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: c, isLoading } = useQuery<Contrato>({
    queryKey: ["contrato", id],
    queryFn: () => fetch(`/api/contratos/${id}`).then((r) => r.json()),
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ["contrato", id] });

  if (isLoading || !c) return <div className="p-6">Carregando...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/contratos"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contrato #{c.id}</h1>
          <p className="text-muted-foreground">{c.alunoNome}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-muted-foreground">Valor total</div><div className="font-medium">{brl(c.valorTotal)}</div></div>
          <div><div className="text-muted-foreground">Parcelas</div><div className="font-medium">{c.numParcelas}x</div></div>
          <div><div className="text-muted-foreground">Desconto</div><div className="font-medium">{c.descontoPercentual}%</div></div>
          <div><div className="text-muted-foreground">Status</div><Badge variant={c.status === "ativo" ? "default" : "secondary"}>{c.status}</Badge></div>
          <div><div className="text-muted-foreground">Dia vencimento</div><div className="font-medium">{c.diaVencimento}</div></div>
          <div><div className="text-muted-foreground">Início</div><div className="font-medium">{c.dataInicio}</div></div>
          {c.observacoes && <div className="col-span-2"><div className="text-muted-foreground">Observações</div><div>{c.observacoes}</div></div>}
        </CardContent>
      </Card>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {c.parcelas.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.numero}</TableCell>
                <TableCell>{p.vencimento}</TableCell>
                <TableCell>{brl(p.valor)}</TableCell>
                <TableCell><Badge variant={badgeVariant(p.status)}>{p.status}</Badge></TableCell>
                <TableCell>{p.metodoPagamento ?? "-"}</TableCell>
                <TableCell className="text-right">
                  {p.status === "pendente" || p.status === "vencido" ? (
                    <RegistrarPagamento parcela={p} onDone={refetch} />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
