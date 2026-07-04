"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

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

type Solicitacao = {
  id: number;
  periodoLetivo: string;
  turmaDestinoNome: string;
  cursoNome: string;
  status: string;
  criadoEm: string;
};

type TurmaDisponivel = {
  id: number;
  nome: string;
  cursoNome: string;
  vagasDisponiveis: number;
};

type Data = { solicitacoes: Solicitacao[]; turmasDisponiveis: TurmaDisponivel[] };

export default function RematriculaPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [turmaId, setTurmaId] = useState("");
  const [periodo, setPeriodo] = useState("");

  const { data, isLoading } = useQuery<Data>({
    queryKey: ["portal-rematricula"],
    queryFn: () => fetch("/api/portal/aluno/rematricula").then((r) => r.json()),
  });

  const criar = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/portal/aluno/rematricula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turmaDestinoId: Number(turmaId), periodoLetivo: periodo }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-rematricula"] });
      toast({ title: "Solicitação enviada" });
      setOpen(false);
      setTurmaId("");
      setPeriodo("");
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rematrícula</h1>
          <p className="text-muted-foreground">
            Solicite a renovação da sua matrícula em uma turma. A secretaria analisará e, se aprovada, você
            será matriculado.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Solicitar rematrícula
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar rematrícula</DialogTitle>
              <DialogDescription>Escolha a turma de destino e o período letivo.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Select value={turmaId} onValueChange={setTurmaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Turma de destino" />
                </SelectTrigger>
                <SelectContent>
                  {data?.turmasDisponiveis.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nome} — {t.cursoNome} ({t.vagasDisponiveis} vagas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Período letivo (ex: 2026.2)"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button disabled={!turmaId || !periodo || criar.isPending} onClick={() => criar.mutate()}>
                {criar.isPending ? "Enviando…" : "Enviar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Turma destino</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : data?.solicitacoes.length ? (
              data.solicitacoes.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.turmaDestinoNome}</TableCell>
                  <TableCell>{s.cursoNome}</TableCell>
                  <TableCell>{s.periodoLetivo}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell>{new Date(s.criadoEm).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhuma solicitação.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
