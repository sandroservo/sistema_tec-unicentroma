"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABEL: Record<string, string> = {
  solicitada: "Solicitada",
  aprovada: "Aprovada",
  recusada: "Recusada",
};

function StatusBadge({ status }: { status: string }) {
  const variant = status === "recusada" ? "destructive" : status === "aprovada" ? "default" : "secondary";
  return (
    <Badge
      variant={variant as never}
      className={status === "aprovada" ? "bg-green-600 hover:bg-green-600" : undefined}
    >
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

type Rematricula = {
  id: number;
  alunoNome: string | null;
  turmaDestinoNome: string;
  cursoNome: string;
  periodoLetivo: string;
  status: string;
  observacao: string | null;
  criadoEm: string;
};

export default function RematriculasAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filtro, setFiltro] = useState("");
  const [atual, setAtual] = useState<Rematricula | null>(null);
  const [acao, setAcao] = useState<"aprovada" | "recusada">("aprovada");
  const [observacao, setObservacao] = useState("");

  const { data, isLoading } = useQuery<Rematricula[]>({
    queryKey: ["rematriculas", filtro],
    queryFn: () =>
      fetch(`/api/rematriculas${filtro ? `?status=${filtro}` : ""}`).then((r) => r.json()),
  });

  const processar = useMutation({
    mutationFn: async () => {
      if (!atual) return;
      const res = await fetch(`/api/rematriculas/${atual.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: acao, observacao: observacao || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rematriculas"] });
      toast({ title: "Solicitação processada" });
      setAtual(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  function abrir(r: Rematricula, a: "aprovada" | "recusada") {
    setAtual(r);
    setAcao(a);
    setObservacao(r.observacao ?? "");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rematrículas</h1>
        <p className="text-muted-foreground">Aprove ou recuse as solicitações de rematrícula.</p>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <Select value={filtro || "todos"} onValueChange={(v) => setFiltro(v === "todos" ? "" : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Turma destino</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : data?.length ? (
              data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.alunoNome ?? "—"}</TableCell>
                  <TableCell>{r.turmaDestinoNome}</TableCell>
                  <TableCell>{r.cursoNome}</TableCell>
                  <TableCell>{r.periodoLetivo}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>{new Date(r.criadoEm).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {r.status === "solicitada" ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => abrir(r, "aprovada")}>
                          Aprovar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => abrir(r, "recusada")}>
                          Recusar
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhuma solicitação.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!atual} onOpenChange={(o) => !o && setAtual(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{acao === "aprovada" ? "Aprovar" : "Recusar"} rematrícula</DialogTitle>
            <DialogDescription>
              {atual?.alunoNome} → {atual?.turmaDestinoNome} ({atual?.periodoLetivo})
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Observação (opcional)"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
          <DialogFooter>
            <Button disabled={processar.isPending} onClick={() => processar.mutate()}>
              {processar.isPending ? "Salvando…" : acao === "aprovada" ? "Aprovar" : "Recusar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
