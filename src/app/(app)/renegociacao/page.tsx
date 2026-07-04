"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Aluno = { id: number; nome: string };
type ParcelaAberta = { id: number; numero: number; valor: number; vencimento: string; contratoId: number };

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function RenegociacaoContent() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const alunoIdParam = searchParams.get("alunoId");

  const [alunoId, setAlunoId] = useState<string>(alunoIdParam ?? "");
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [numParcelas, setNumParcelas] = useState(1);
  const [diaVencimento, setDiaVencimento] = useState(10);
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [motivo, setMotivo] = useState("");

  const { data: alunos } = useQuery<Aluno[]>({
    queryKey: ["alunos-select"],
    queryFn: async () => {
      const res = await fetch("/api/alunos?limit=100");
      if (!res.ok) throw new Error();
      const json = await res.json();
      return json.data;
    },
  });

  const { data: parcelas, isLoading: loadingParcelas } = useQuery<ParcelaAberta[]>({
    queryKey: ["parcelas-abertas", alunoId],
    enabled: !!alunoId,
    queryFn: async () => {
      const res = await fetch(`/api/financeiro/parcelas-abertas?alunoId=${alunoId}`);
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  // Ao trocar de aluno, limpa a seleção.
  useEffect(() => {
    setSelecionadas(new Set());
  }, [alunoId]);

  const valorSelecionado = useMemo(
    () => (parcelas ?? []).filter((p) => selecionadas.has(p.id)).reduce((s, p) => s + p.valor, 0),
    [parcelas, selecionadas],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/renegociacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alunoId: Number(alunoId),
          parcelaIds: [...selecionadas],
          numParcelas,
          diaVencimento,
          dataInicio,
          motivo: motivo || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao renegociar");
      return json as { ok: boolean; novoContratoId: number };
    },
    onSuccess: (data) => {
      toast({ title: "Renegociação concluída", description: "Novo contrato gerado com sucesso." });
      router.push(`/contratos/${data.novoContratoId}`);
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const toggle = (id: number) =>
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Renegociação</h1>
        <p className="text-muted-foreground">Selecione parcelas em aberto e gere um novo contrato.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aluno</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={alunoId} onValueChange={setAlunoId}>
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder="Selecione o aluno" />
            </SelectTrigger>
            <SelectContent>
              {(alunos ?? []).map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {alunoId && (
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingParcelas ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">Carregando parcelas...</TableCell>
                </TableRow>
              ) : parcelas && parcelas.length > 0 ? (
                parcelas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Checkbox checked={selecionadas.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                    </TableCell>
                    <TableCell>#{p.numero}</TableCell>
                    <TableCell>#{p.contratoId}</TableCell>
                    <TableCell>
                      {p.vencimento ? new Date(p.vencimento).toLocaleDateString("pt-BR") : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.valor)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    Nenhuma parcela em aberto.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {selecionadas.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo contrato</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="text-lg">
              Valor total selecionado:{" "}
              <span className="font-bold">{formatCurrency(valorSelecionado)}</span>{" "}
              <span className="text-sm text-muted-foreground">({selecionadas.size} parcelas)</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="numParcelas">Nº de parcelas</Label>
                <Input
                  id="numParcelas"
                  type="number"
                  min={1}
                  value={numParcelas}
                  onChange={(e) => setNumParcelas(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diaVencimento">Dia de vencimento</Label>
                <Input
                  id="diaVencimento"
                  type="number"
                  min={1}
                  max={31}
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(Math.min(31, Math.max(1, parseInt(e.target.value) || 10)))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dataInicio">Data de início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="motivo">Motivo (opcional)</Label>
              <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
            <div>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? "Processando..." : "Confirmar renegociação"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function RenegociacaoPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <RenegociacaoContent />
    </Suspense>
  );
}
