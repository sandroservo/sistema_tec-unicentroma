"use client";

// TODO: link no app-sidebar (Biblioteca)

import { useState } from "react";
import Link from "next/link";
import { useTitulos, useReservar, useAlunos } from "./_hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, BookMarked } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";

export default function AcervoPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useTitulos(search || undefined);
  const { pageItems, page, setPage, totalPages, total } = usePagination(data?.data);

  const [reservarId, setReservarId] = useState<number | null>(null);
  const [alunoId, setAlunoId] = useState<string>("");
  const { data: alunos } = useAlunos();
  const reservar = useReservar();
  const { toast } = useToast();

  function submitReserva() {
    if (!reservarId || !alunoId) return;
    reservar.mutate(
      { tituloId: reservarId, alunoId: Number(alunoId) },
      {
        onSuccess: () => {
          toast({ title: "Reserva criada", description: "Reserva registrada com sucesso." });
          setReservarId(null);
          setAlunoId("");
        },
        onError: (e) => toast({ title: "Erro", description: (e as Error).message, variant: "destructive" }),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Biblioteca</h1>
          <p className="text-muted-foreground">Acervo de títulos e exemplares.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/biblioteca/emprestimos">Empréstimos</Link>
          </Button>
          <Button asChild>
            <Link href="/biblioteca/novo"><Plus className="w-4 h-4 mr-2" />Novo título</Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, autor ou ISBN..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Exemplares</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center h-24">Carregando...</TableCell></TableRow>
            ) : data?.data?.length ? (
              pageItems.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.titulo}</TableCell>
                  <TableCell>{t.autor || "-"}</TableCell>
                  <TableCell>{t.categoria || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={t.disponiveis ? "default" : "secondary"}>
                      {t.disponiveis ?? 0} / {t.totalExemplares ?? 0} disponíveis
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild title="Ver exemplares">
                        <Link href={`/biblioteca/${t.id}`}><Eye className="w-4 h-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" title="Reservar" onClick={() => setReservarId(t.id)}>
                        <BookMarked className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhum título encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationBar page={page} totalPages={totalPages} total={total} onChange={setPage} />

      <Dialog open={reservarId != null} onOpenChange={(o) => !o && setReservarId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reservar título</DialogTitle></DialogHeader>
          <Select value={alunoId} onValueChange={setAlunoId}>
            <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
            <SelectContent>
              {alunos?.data?.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={submitReserva} disabled={!alunoId || reservar.isPending}>
              {reservar.isPending ? "Reservando..." : "Reservar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
