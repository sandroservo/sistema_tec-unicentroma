"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

type Inscricao = {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  nota: number | null;
  classificacao: number | null;
  status: string;
  pagamentoStatus: string;
  alunoId: number | null;
};
type Processo = {
  id: number;
  nome: string;
  descricao: string | null;
  vagas: number;
  inscricaoInicio: string | null;
  inscricaoFim: string | null;
  dataProva: string | null;
  taxaInscricao: number;
  status: string;
  inscricoes: Inscricao[];
};

export default function ProcessoDetalhe() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["selecao", id],
    queryFn: async (): Promise<Processo> => {
      const res = await fetch(`/api/selecao/${id}`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["selecao", id] });

  const patch = useMutation({
    mutationFn: async ({ inscricaoId, body }: { inscricaoId: number; body: Record<string, unknown> }) => {
      const res = await fetch(`/api/selecao/inscricoes/${inscricaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    onSuccess: invalidate,
    onError: () => toast({ title: "Erro", description: "Falha ao atualizar inscrição.", variant: "destructive" }),
  });

  const matricular = useMutation({
    mutationFn: async (inscricaoId: number) => {
      const res = await fetch(`/api/selecao/inscricoes/${inscricaoId}/matricular`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro");
      return res.json();
    },
    onSuccess: (r) => {
      toast({ title: "Matriculado", description: `Aluno #${r.alunoId} criado/vinculado.` });
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (isLoading || !data) return <div className="p-6">Carregando...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/selecao"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.nome}</h1>
          <p className="text-muted-foreground">{data.descricao}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados do processo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-muted-foreground">Status</div><Badge>{data.status}</Badge></div>
          <div><div className="text-muted-foreground">Vagas</div>{data.vagas}</div>
          <div><div className="text-muted-foreground">Inscrições</div>{data.inscricaoInicio} — {data.inscricaoFim}</div>
          <div><div className="text-muted-foreground">Prova</div>{data.dataProva ?? "-"}</div>
          <div><div className="text-muted-foreground">Taxa</div>R$ {data.taxaInscricao.toFixed(2)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Inscrições ({data.inscricoes.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class.</TableHead>
                <TableHead>Candidato</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.inscricoes.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Sem inscrições.</TableCell></TableRow>
              ) : data.inscricoes.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.classificacao ?? "-"}</TableCell>
                  <TableCell>
                    <div className="font-medium">{i.nome}</div>
                    <div className="text-xs text-muted-foreground">{i.cpf} · {i.email}</div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={i.nota ?? ""}
                      className="w-20"
                      onBlur={(e) => {
                        const v = e.target.value;
                        const nota = v === "" ? null : Number(v);
                        if (nota !== i.nota) patch.mutate({ inscricaoId: i.id, body: { nota } });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={i.status} onValueChange={(status) => patch.mutate({ inscricaoId: i.id, body: { status } })}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inscrito">Inscrito</SelectItem>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="reprovado">Reprovado</SelectItem>
                        <SelectItem value="convocado">Convocado</SelectItem>
                        <SelectItem value="matriculado">Matriculado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={i.pagamentoStatus} onValueChange={(pagamentoStatus) => patch.mutate({ inscricaoId: i.id, body: { pagamentoStatus } })}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="isento">Isento</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    {i.status === "matriculado" ? (
                      <Badge variant="secondary">Aluno #{i.alunoId}</Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!["convocado", "aprovado"].includes(i.status) || matricular.isPending}
                        onClick={() => matricular.mutate(i.id)}
                      >
                        Matricular
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
