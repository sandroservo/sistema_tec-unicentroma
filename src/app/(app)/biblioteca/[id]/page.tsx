"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTitulo, useAlunos, useCreateExemplar, useEmprestar, type Exemplar } from "../_hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, QrCode } from "lucide-react";

const statusVariant = (s: string) =>
  s === "disponivel" ? "default" : s === "emprestado" ? "secondary" : "outline";

export default function TituloDetalhe() {
  const params = useParams();
  const id = Number(params.id);
  const { data: titulo, isLoading } = useTitulo(id);
  const { toast } = useToast();

  const [qrExemplar, setQrExemplar] = useState<Exemplar | null>(null);
  const [emprestarEx, setEmprestarEx] = useState<Exemplar | null>(null);
  const [alunoId, setAlunoId] = useState("");
  const [prazo, setPrazo] = useState("14");
  const [novaLoc, setNovaLoc] = useState("");

  const { data: alunos } = useAlunos();
  const criarExemplar = useCreateExemplar();
  const emprestar = useEmprestar();

  function addExemplar() {
    criarExemplar.mutate(
      { tituloId: id, localizacao: novaLoc || undefined },
      {
        onSuccess: () => { toast({ title: "Exemplar adicionado" }); setNovaLoc(""); },
        onError: (e) => toast({ title: "Erro", description: (e as Error).message, variant: "destructive" }),
      },
    );
  }

  function submitEmprestimo() {
    if (!emprestarEx || !alunoId) return;
    emprestar.mutate(
      { exemplarId: emprestarEx.id, alunoId: Number(alunoId), prazoDias: Number(prazo) },
      {
        onSuccess: () => {
          toast({ title: "Empréstimo registrado" });
          setEmprestarEx(null); setAlunoId("");
        },
        onError: (e) => toast({ title: "Erro", description: (e as Error).message, variant: "destructive" }),
      },
    );
  }

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!titulo) return <p className="text-muted-foreground">Título não encontrado.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/biblioteca"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{titulo.titulo}</h1>
          <p className="text-muted-foreground">
            {titulo.autor || "Autor desconhecido"} {titulo.ano ? `· ${titulo.ano}` : ""} {titulo.categoria ? `· ${titulo.categoria}` : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exemplares</CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="Localização (opcional)" value={novaLoc} onChange={(e) => setNovaLoc(e.target.value)} className="w-56" />
            <Button size="sm" onClick={addExemplar} disabled={criarExemplar.isPending}>
              <Plus className="w-4 h-4 mr-1" />Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {titulo.exemplares.length ? titulo.exemplares.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell className="font-mono">{ex.codigo}</TableCell>
                  <TableCell><Badge variant={statusVariant(ex.status)}>{ex.status}</Badge></TableCell>
                  <TableCell>{ex.localizacao || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="Ver QR" onClick={() => setQrExemplar(ex)}>
                        <QrCode className="w-4 h-4" />
                      </Button>
                      {ex.status === "disponivel" && (
                        <Button variant="outline" size="sm" onClick={() => setEmprestarEx(ex)}>Emprestar</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="text-center h-20 text-muted-foreground">Nenhum exemplar.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* QR */}
      <Dialog open={qrExemplar != null} onOpenChange={(o) => !o && setQrExemplar(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>QR Code · {qrExemplar?.codigo}</DialogTitle></DialogHeader>
          {qrExemplar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/biblioteca/exemplares/${qrExemplar.id}/qr`} alt={qrExemplar.codigo} className="mx-auto" />
          )}
        </DialogContent>
      </Dialog>

      {/* Emprestar */}
      <Dialog open={emprestarEx != null} onOpenChange={(o) => !o && setEmprestarEx(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Emprestar · {emprestarEx?.codigo}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={alunoId} onValueChange={setAlunoId}>
              <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
              <SelectContent>
                {alunos?.data?.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <label className="text-sm text-muted-foreground">Prazo (dias)</label>
              <Input type="number" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitEmprestimo} disabled={!alunoId || emprestar.isPending}>
              {emprestar.isPending ? "Registrando..." : "Confirmar empréstimo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
