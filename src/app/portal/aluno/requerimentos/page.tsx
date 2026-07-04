"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

const TIPOS: Record<string, string> = {
  declaracao_matricula: "Declaração de matrícula",
  historico: "Histórico escolar",
  declaracao_conclusao: "Declaração de conclusão",
  segunda_via_boletim: "2ª via de boletim",
  revisao_nota: "Revisão de nota",
  outro: "Outro",
};

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  indeferido: "Indeferido",
};

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "concluido"
      ? "default"
      : status === "indeferido"
        ? "destructive"
        : status === "em_andamento"
          ? "default"
          : "secondary";
  return (
    <Badge
      variant={variant as never}
      className={status === "concluido" ? "bg-green-600 hover:bg-green-600" : undefined}
    >
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

type Requerimento = {
  id: number;
  protocolo: string;
  tipo: string;
  descricao: string | null;
  status: string;
  resposta: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export default function RequerimentosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("");
  const [descricao, setDescricao] = useState("");

  const { data, isLoading } = useQuery<Requerimento[]>({
    queryKey: ["portal-requerimentos"],
    queryFn: () => fetch("/api/portal/aluno/requerimentos").then((r) => r.json()),
  });

  const criar = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/portal/aluno/requerimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, descricao: descricao || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      return res.json();
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["portal-requerimentos"] });
      toast({ title: "Requerimento enviado", description: `Protocolo ${r.protocolo}` });
      setOpen(false);
      setTipo("");
      setDescricao("");
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Requerimentos</h1>
          <p className="text-muted-foreground">Abra solicitações e acompanhe o andamento.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo requerimento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo requerimento</DialogTitle>
              <DialogDescription>Selecione o tipo e descreva sua solicitação.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de requerimento" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Descrição (opcional)"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button disabled={!tipo || criar.isPending} onClick={() => criar.mutate()}>
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
              <TableHead>Protocolo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Resposta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : data?.length ? (
              data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.protocolo}</TableCell>
                  <TableCell>{TIPOS[r.tipo] ?? r.tipo}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>{new Date(r.criadoEm).toLocaleDateString()}</TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">
                    {r.resposta || "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum requerimento.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
