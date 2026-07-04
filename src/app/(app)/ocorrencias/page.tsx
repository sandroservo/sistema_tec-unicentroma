"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Ocorrencia = {
  id: number;
  alunoId: number;
  alunoNome: string;
  tipo: string;
  gravidade: string;
  descricao: string;
  data: string | null;
};
type Aluno = { id: number; nome: string };

const TIPOS = ["advertencia", "elogio", "observacao", "suspensao"] as const;
const GRAVIDADES = ["baixa", "media", "alta"] as const;

const tipoBadge = (t: string): { variant: "default" | "secondary" | "destructive" | "outline"; className?: string } => {
  if (t === "elogio") return { variant: "outline", className: "border-green-500 text-green-600" };
  if (t === "observacao") return { variant: "secondary" };
  if (t === "advertencia") return { variant: "outline", className: "border-amber-500 text-amber-600" };
  if (t === "suspensao") return { variant: "destructive" };
  return { variant: "default" };
};
const gravidadeVariant = (g: string): "default" | "secondary" | "destructive" =>
  g === "baixa" ? "secondary" : g === "alta" ? "destructive" : "default";

export default function OcorrenciasPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filtroAluno, setFiltroAluno] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ alunoId: "", tipo: "advertencia", gravidade: "media", descricao: "", data: "" });

  const { data: alunosResp } = useQuery<{ data: Aluno[] }>({
    queryKey: ["alunos-select"],
    queryFn: () => fetch("/api/alunos?limit=100").then((r) => r.json()),
  });
  const alunos = alunosResp?.data ?? [];

  const { data, isLoading } = useQuery<{ data: Ocorrencia[] }>({
    queryKey: ["ocorrencias", filtroAluno, filtroTipo],
    queryFn: () => {
      const p = new URLSearchParams();
      if (filtroAluno) p.set("alunoId", filtroAluno);
      if (filtroTipo) p.set("tipo", filtroTipo);
      return fetch(`/api/ocorrencias?${p}`).then((r) => r.json());
    },
  });

  const criar = useMutation({
    mutationFn: () =>
      fetch("/api/ocorrencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ocorrencias"] });
      toast({ title: "Ocorrência registrada" });
      setOpen(false);
      setForm({ alunoId: "", tipo: "advertencia", gravidade: "media", descricao: "", data: "" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar.", variant: "destructive" }),
  });

  const excluir = useMutation({
    mutationFn: (id: number) => fetch(`/api/ocorrencias/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ocorrencias"] });
      toast({ title: "Ocorrência excluída" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" }),
  });

  const podeSalvar = form.alunoId && form.descricao.trim() && form.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ocorrências Disciplinares</h1>
          <p className="text-muted-foreground">Registro de ocorrências dos alunos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Registrar ocorrência
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar ocorrência</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Aluno</Label>
                <Select value={form.alunoId} onValueChange={(v) => setForm((f) => ({ ...f, alunoId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {alunos.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-1 flex-col gap-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label>Gravidade</Label>
                  <Select value={form.gravidade} onValueChange={(v) => setForm((f) => ({ ...f, gravidade: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRAVIDADES.map((g) => (
                        <SelectItem key={g} value={g} className="capitalize">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => criar.mutate()} disabled={!podeSalvar || criar.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <Select value={filtroAluno || "todos"} onValueChange={(v) => setFiltroAluno(v === "todos" ? "" : v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todos os alunos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os alunos</SelectItem>
            {alunos.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroTipo || "todos"} onValueChange={(v) => setFiltroTipo(v === "todos" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Gravidade</TableHead>
              <TableHead>Descrição</TableHead>
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
            ) : data?.data?.length ? (
              data.data.map((o) => {
                const tb = tipoBadge(o.tipo);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.alunoNome}</TableCell>
                    <TableCell>
                      <Badge variant={tb.variant} className={`capitalize ${tb.className ?? ""}`}>
                        {o.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={gravidadeVariant(o.gravidade)} className="capitalize">
                        {o.gravidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate" title={o.descricao}>
                      {o.descricao}
                    </TableCell>
                    <TableCell className="tabular-nums">{o.data}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir ocorrência?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => excluir.mutate(o.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhuma ocorrência registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
