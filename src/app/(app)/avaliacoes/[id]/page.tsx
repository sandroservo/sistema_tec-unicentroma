"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

type Avaliacao = {
  id: number; turmaNome: string | null; disciplinaNome: string | null;
  tipo: string; descricao: string | null; peso: number; data: string | null;
};
type Item = { alunoId: number; alunoNome: string; valor: number | null };

const fetchJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro ao carregar");
  return res.json();
};

export default function LancamentoNotas() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();

  const { data: avaliacao } = useQuery<Avaliacao>({
    queryKey: ["avaliacao", id],
    queryFn: () => fetchJson(`/api/avaliacoes/${id}`),
  });
  const { data: itens, isLoading } = useQuery<Item[]>({
    queryKey: ["lancamentos", id],
    queryFn: () => fetchJson(`/api/avaliacoes/${id}/lancamentos`),
  });

  // valores editáveis por alunoId (string do input)
  const [valores, setValores] = useState<Record<number, string>>({});
  useEffect(() => {
    if (itens) setValores(Object.fromEntries(itens.map((i) => [i.alunoId, i.valor == null ? "" : String(i.valor)])));
  }, [itens]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = Object.entries(valores).map(([alunoId, v]) => ({
        alunoId: Number(alunoId),
        valor: v === "" ? null : Number(v),
      }));
      const res = await fetch(`/api/avaliacoes/${id}/lancamentos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      return res.json();
    },
    onSuccess: () => toast({ title: "Sucesso", description: "Notas salvas." }),
    onError: () => toast({ title: "Erro", description: "Não foi possível salvar as notas.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/avaliacoes"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{avaliacao?.descricao || "Avaliação"}</h1>
            {avaliacao && <Badge variant="secondary">{avaliacao.tipo}</Badge>}
          </div>
          <p className="text-muted-foreground">
            {avaliacao?.turmaNome ?? "-"} · {avaliacao?.disciplinaNome ?? "-"} · Peso {avaliacao?.peso ?? "-"}
            {avaliacao?.data ? ` · ${avaliacao.data}` : ""}
          </p>
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead className="w-[160px]">Nota (0–10)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={2} className="text-center h-24">Carregando...</TableCell></TableRow>
            ) : itens && itens.length > 0 ? (
              itens.map((i) => (
                <TableRow key={i.alunoId}>
                  <TableCell className="font-medium">{i.alunoNome}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={valores[i.alunoId] ?? ""}
                      onChange={(e) => setValores((prev) => ({ ...prev, [i.alunoId]: e.target.value }))}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">Nenhum aluno ativo na turma.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending || !itens?.length}>
          {save.isPending ? "Salvando..." : "Salvar notas"}
        </Button>
      </div>
    </div>
  );
}
