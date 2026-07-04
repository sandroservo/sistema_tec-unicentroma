"use client";

import { useState } from "react";
import Link from "next/link";
import { useEmprestimos, useDevolver, usePagarMulta } from "../_hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const statusVariant = (s: string) =>
  s === "atrasado" ? "destructive" : s === "devolvido" ? "secondary" : "default";

export default function EmprestimosPage() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = useEmprestimos(status && status !== "todos" ? status : undefined);
  const devolver = useDevolver();
  const pagarMulta = usePagarMulta();
  const { toast } = useToast();

  function onDevolver(id: number) {
    devolver.mutate(id, {
      onSuccess: (res) => {
        toast({
          title: "Devolução registrada",
          description: res?.multa ? `Multa gerada: R$ ${res.multa.valor.toFixed(2)}` : "Sem multa.",
        });
      },
      onError: (e) => toast({ title: "Erro", description: (e as Error).message, variant: "destructive" }),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/biblioteca"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empréstimos</h1>
          <p className="text-muted-foreground">Controle de empréstimos e devoluções.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos os status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="devolvido">Devolvido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Data prevista</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Multa</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center h-24">Carregando...</TableCell></TableRow>
            ) : data?.data?.length ? (
              data.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.alunoNome}</TableCell>
                  <TableCell>{e.tituloNome} <span className="text-xs text-muted-foreground font-mono">({e.exemplarCodigo})</span></TableCell>
                  <TableCell>{e.dataPrevista}</TableCell>
                  <TableCell><Badge variant={statusVariant(e.status)}>{e.status}</Badge></TableCell>
                  <TableCell>
                    {e.multa ? (
                      <span className={e.multa.paga ? "text-muted-foreground" : "text-destructive"}>
                        R$ {e.multa.valor.toFixed(2)} {e.multa.paga ? "(paga)" : ""}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {e.status !== "devolvido" && (
                        <Button variant="outline" size="sm" onClick={() => onDevolver(e.id)} disabled={devolver.isPending}>
                          Devolver
                        </Button>
                      )}
                      {e.multa && !e.multa.paga && (
                        <Button variant="ghost" size="sm" onClick={() => pagarMulta.mutate(e.multa!.id)} disabled={pagarMulta.isPending}>
                          Pagar multa
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nenhum empréstimo.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
