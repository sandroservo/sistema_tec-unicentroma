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
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";

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
  alunoNome: string | null;
  tipo: string;
  descricao: string | null;
  status: string;
  resposta: string | null;
  criadoEm: string;
};

export default function RequerimentosAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filtro, setFiltro] = useState("");
  const [atual, setAtual] = useState<Requerimento | null>(null);
  const [status, setStatus] = useState("");
  const [resposta, setResposta] = useState("");

  const { data, isLoading } = useQuery<Requerimento[]>({
    queryKey: ["requerimentos", filtro],
    queryFn: () =>
      fetch(`/api/requerimentos${filtro ? `?status=${filtro}` : ""}`).then((r) => r.json()),
  });
  const { pageItems, page, setPage, totalPages, total } = usePagination(data);

  const atender = useMutation({
    mutationFn: async () => {
      if (!atual) return;
      const res = await fetch(`/api/requerimentos/${atual.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resposta: resposta || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requerimentos"] });
      toast({ title: "Requerimento atualizado" });
      setAtual(null);
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  function abrir(r: Requerimento) {
    setAtual(r);
    setStatus(r.status);
    setResposta(r.resposta ?? "");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Requerimentos</h1>
        <p className="text-muted-foreground">Atenda às solicitações dos alunos.</p>
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
              <TableHead>Protocolo</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : data?.length ? (
              pageItems.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.protocolo}</TableCell>
                  <TableCell>{r.alunoNome ?? "—"}</TableCell>
                  <TableCell>{TIPOS[r.tipo] ?? r.tipo}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>{new Date(r.criadoEm).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => abrir(r)}>
                      Atender
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum requerimento.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onChange={setPage} />

      <Dialog open={!!atual} onOpenChange={(o) => !o && setAtual(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atender requerimento</DialogTitle>
            <DialogDescription>
              {atual?.protocolo} — {atual && (TIPOS[atual.tipo] ?? atual.tipo)}
            </DialogDescription>
          </DialogHeader>
          {atual?.descricao && (
            <p className="text-sm text-muted-foreground border rounded-md p-3">{atual.descricao}</p>
          )}
          <div className="flex flex-col gap-4">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Resposta ao aluno (opcional)"
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button disabled={!status || atender.isPending} onClick={() => atender.mutate()}>
              {atender.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
