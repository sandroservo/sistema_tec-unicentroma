"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";

const PUBLICO_LABEL: Record<string, string> = {
  todos: "Todos",
  alunos: "Alunos",
  professores: "Professores",
  responsaveis: "Responsáveis",
};

type Aviso = {
  id: number;
  titulo: string;
  conteudo: string;
  publico: string;
  fixado: boolean;
  ativo: boolean;
  expiraEm: string | null;
  criadoEm: string;
};

type Form = {
  titulo: string;
  conteudo: string;
  publico: string;
  fixado: boolean;
  ativo: boolean;
  expiraEm: string;
};

const EMPTY: Form = { titulo: "", conteudo: "", publico: "todos", fixado: false, ativo: true, expiraEm: "" };

export default function AvisosAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [excluir, setExcluir] = useState<Aviso | null>(null);

  const { data, isLoading } = useQuery<Aviso[]>({
    queryKey: ["avisos"],
    queryFn: () => fetch("/api/avisos").then((r) => r.json()),
  });
  const { pageItems, page, setPage, totalPages, total } = usePagination(data);

  const salvar = useMutation({
    mutationFn: async () => {
      const body = {
        titulo: form.titulo,
        conteudo: form.conteudo,
        publico: form.publico,
        fixado: form.fixado,
        ativo: form.ativo,
        expiraEm: form.expiraEm || null,
      };
      const res = await fetch(editId ? `/api/avisos/${editId}` : "/api/avisos", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avisos"] });
      qc.invalidateQueries({ queryKey: ["avisos-feed"] });
      toast({ title: editId ? "Aviso atualizado" : "Aviso criado" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remover = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/avisos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avisos"] });
      qc.invalidateQueries({ queryKey: ["avisos-feed"] });
      toast({ title: "Aviso excluído" });
      setExcluir(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  function novo() {
    setEditId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function editar(a: Aviso) {
    setEditId(a.id);
    setForm({
      titulo: a.titulo,
      conteudo: a.conteudo,
      publico: a.publico,
      fixado: a.fixado,
      ativo: a.ativo,
      expiraEm: a.expiraEm ?? "",
    });
    setOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mural de Avisos</h1>
          <p className="text-muted-foreground">Publique avisos por público-alvo.</p>
        </div>
        <Button onClick={novo}>Novo aviso</Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Público</TableHead>
              <TableHead>Fixado</TableHead>
              <TableHead>Ativo</TableHead>
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
              pageItems.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.titulo}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{PUBLICO_LABEL[a.publico] ?? a.publico}</Badge>
                  </TableCell>
                  <TableCell>{a.fixado ? "Sim" : "—"}</TableCell>
                  <TableCell>{a.ativo ? "Sim" : "Não"}</TableCell>
                  <TableCell>{new Date(a.criadoEm).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => editar(a)}>
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setExcluir(a)}>
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum aviso.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onChange={setPage} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar aviso" : "Novo aviso"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Título</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Conteúdo</Label>
              <Textarea
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Público-alvo</Label>
              <Select value={form.publico} onValueChange={(v) => setForm({ ...form, publico: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PUBLICO_LABEL).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Expira em (opcional)</Label>
              <Input
                type="date"
                value={form.expiraEm}
                onChange={(e) => setForm({ ...form, expiraEm: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.fixado} onCheckedChange={(v) => setForm({ ...form, fixado: v })} />
              <Label>Fixar no topo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!form.titulo || !form.conteudo || salvar.isPending}
              onClick={() => salvar.mutate()}
            >
              {salvar.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aviso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O aviso “{excluir?.titulo}” será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (excluir) remover.mutate(excluir.id);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
