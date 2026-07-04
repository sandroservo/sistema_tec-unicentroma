"use client";

// TODO: link no app-sidebar

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

type PlanoConta = {
  id: number;
  codigo: string | null;
  nome: string;
  tipo: string;
  ativo: boolean;
};

export default function PlanoContasPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<"receita" | "despesa">("despesa");

  const { data, isLoading } = useQuery<PlanoConta[]>({
    queryKey: ["planos-conta"],
    queryFn: () => fetch("/api/planos-conta").then((r) => r.json()),
  });

  const criar = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/planos-conta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, codigo: codigo || undefined, tipo, ativo: true }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planos-conta"] });
      toast({ title: "Sucesso", description: "Plano de conta criado." });
      setOpen(false);
      setNome(""); setCodigo(""); setTipo("despesa");
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível criar.", variant: "destructive" }),
  });

  const excluir = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/planos-conta/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planos-conta"] });
      toast({ title: "Excluído", description: "Plano de conta removido." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plano de Contas</h1>
          <p className="text-muted-foreground">Categorias de receitas e despesas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Novo plano</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo plano de conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome *</label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Despesas administrativas" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Código</label>
                <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: 3.1.01" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo *</label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as "receita" | "despesa")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="receita">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => criar.mutate()} disabled={!nome || criar.isPending}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Carregando...</TableCell>
              </TableRow>
            ) : data && data.length > 0 ? (
              data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.codigo ?? "—"}</TableCell>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>
                    <Badge variant={p.tipo === "receita" ? "default" : "secondary"}>{p.tipo}</Badge>
                  </TableCell>
                  <TableCell>{p.ativo ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => excluir.mutate(p.id)} title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhum plano de conta cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
