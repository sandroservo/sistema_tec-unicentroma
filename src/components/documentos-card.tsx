"use client";

// Card reutilizável de documentos de um dono (Aluno/Professor/Funcionario).
// Uso: <DocumentosCard donoTipo="Aluno" donoId={String(aluno.id)} />
// Requer QueryClientProvider (já em src/app/providers.tsx) e Toaster montado.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

type Documento = {
  id: string;
  nome: string;
  tipo: string;
  mime: string;
  tamanho: number;
  criadoEm: string;
};

const TIPOS = ["rg", "cpf", "contrato", "foto", "comprovante", "diploma", "outro"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentosCard({ donoTipo, donoId }: { donoTipo: string; donoId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<string>(TIPOS[0]);

  const queryKey = ["documentos", donoTipo, donoId];

  const { data: docs = [], isLoading } = useQuery<Documento[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(
        `/api/documentos?donoTipo=${encodeURIComponent(donoTipo)}&donoId=${encodeURIComponent(donoId)}`,
      );
      if (!res.ok) throw new Error("Falha ao carregar documentos");
      return res.json();
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione um arquivo");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("donoTipo", donoTipo);
      fd.append("donoId", donoId);
      fd.append("tipo", tipo);
      const res = await fetch("/api/documentos", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Falha no upload");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Documento enviado" });
      setFile(null);
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documentos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir");
    },
    onSuccess: () => {
      toast({ title: "Documento excluído" });
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="max-w-xs"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => upload.mutate()} disabled={!file || upload.isPending}>
            {upload.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>Carregando...</TableCell>
              </TableRow>
            ) : docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>Nenhum documento.</TableCell>
              </TableRow>
            ) : (
              docs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{doc.nome}</TableCell>
                  <TableCell>{doc.tipo}</TableCell>
                  <TableCell>{formatSize(doc.tamanho)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/documentos/${doc.id}`} target="_blank" rel="noreferrer">
                        Baixar
                      </a>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => remove.mutate(doc.id)}
                      disabled={remove.isPending}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
