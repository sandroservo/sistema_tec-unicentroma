"use client";

// TODO: link no app-sidebar (Comunicados)

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Comunicado = {
  id: number;
  titulo: string;
  mensagem: string;
  canal: string;
  destinatarios: number;
  status: string;
  criadoEm: string;
};

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
  return res.json();
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  enviado: "default",
  parcial: "secondary",
  falhou: "destructive",
};

export default function ComunicadosPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [canal, setCanal] = useState("notificacao");
  const [publico, setPublico] = useState("todos_alunos");

  const { data: status } = useQuery({
    queryKey: ["integracoes-status"],
    queryFn: () => json<{ evolution: boolean; pix: boolean; assinatura: boolean }>("/api/integracoes/status"),
  });
  const whatsappOff = status?.evolution === false;

  const { data: comunicados, isLoading } = useQuery({
    queryKey: ["comunicados"],
    queryFn: () => json<Comunicado[]>("/api/comunicados"),
  });

  const enviar = useMutation({
    mutationFn: () =>
      json<{ enviados: number; falhas: number; status: string }>("/api/comunicados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, mensagem, canal, publico }),
      }),
    onSuccess: (r) => {
      toast({ title: "Comunicado enviado", description: `${r.enviados} enviados, ${r.falhas} falhas.` });
      setTitulo("");
      setMensagem("");
      qc.invalidateQueries({ queryKey: ["comunicados"] });
    },
    onError: (e) => toast({ title: "Erro", description: String(e), variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comunicados</h1>
        <p className="text-muted-foreground">Envie avisos por notificação in-app ou WhatsApp.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo comunicado</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Assunto do comunicado" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Mensagem</Label>
            <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={4} placeholder="Texto..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Canal</Label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="notificacao">Notificação (in-app)</SelectItem>
                  <SelectItem value="whatsapp" disabled={whatsappOff}>WhatsApp</SelectItem>
                </SelectContent>
              </Select>
              {whatsappOff && <p className="text-xs text-amber-600">WhatsApp não configurado (Evolution API).</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Público</Label>
              <Select value={publico} onValueChange={setPublico}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos_alunos">Todos os alunos</SelectItem>
                  <SelectItem value="inadimplentes">Inadimplentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Button
              onClick={() => enviar.mutate()}
              disabled={enviar.isPending || !titulo.trim() || !mensagem.trim()}
            >
              {enviar.isPending ? "Enviando..." : "Enviar comunicado"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="text-right">Destinatários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center h-24">Carregando...</TableCell></TableRow>
            ) : comunicados && comunicados.length > 0 ? (
              comunicados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.titulo}</TableCell>
                  <TableCell className="capitalize">{c.canal}</TableCell>
                  <TableCell className="text-right">{c.destinatarios}</TableCell>
                  <TableCell><Badge variant={statusVariant[c.status] ?? "secondary"}>{c.status}</Badge></TableCell>
                  <TableCell>{new Date(c.criadoEm).toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Nenhum comunicado enviado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
