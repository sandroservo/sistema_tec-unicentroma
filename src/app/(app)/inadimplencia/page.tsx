"use client";

// TODO: link no app-sidebar (Inadimplência)
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Users, HandCoins } from "lucide-react";

type AlunoInadimplente = {
  alunoId: number;
  alunoNome: string;
  qtdParcelas: number;
  valorEmAtraso: number;
  diasAtrasoMax: number;
};
type Relatorio = { alunos: AlunoInadimplente[]; totalEmAtraso: number; totalAlunos: number };

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function InadimplenciaPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery<Relatorio>({
    queryKey: ["inadimplencia"],
    queryFn: async () => {
      const res = await fetch("/api/financeiro/inadimplencia");
      if (!res.ok) throw new Error("Erro ao carregar relatório");
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inadimplência</h1>
        <p className="text-muted-foreground">Parcelas vencidas e não pagas, agrupadas por aluno.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-destructive">Total em Atraso</CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(data?.totalEmAtraso || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Alunos Inadimplentes</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalAlunos || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead className="text-center">Parcelas</TableHead>
              <TableHead className="text-right">Valor em Atraso</TableHead>
              <TableHead className="text-center">Dias de Atraso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Carregando...</TableCell>
              </TableRow>
            ) : data?.alunos && data.alunos.length > 0 ? (
              data.alunos.map((a) => (
                <TableRow key={a.alunoId}>
                  <TableCell className="font-medium">{a.alunoNome}</TableCell>
                  <TableCell className="text-center">{a.qtdParcelas}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">
                    {formatCurrency(a.valorEmAtraso)}
                  </TableCell>
                  <TableCell className="text-center">{a.diasAtrasoMax}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/renegociacao?alunoId=${a.alunoId}`)}
                    >
                      <HandCoins className="w-4 h-4 mr-2" />
                      Renegociar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhum aluno inadimplente.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
