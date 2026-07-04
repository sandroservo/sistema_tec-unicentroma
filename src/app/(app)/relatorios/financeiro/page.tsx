"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";
import { ReportHeader, StatCard, brl, fetchJson, fmtData, tooltipStyle, useReportError } from "../report-ui";

type Resp = {
  totais: { recebidoPeriodo: number; pendente: number; vencido: number; bolsasAtivas: number; valorBolsas: number };
  porMetodo: { metodo: string; valor: number }[];
  porMes: { mes: string; recebido: number }[];
  linhas: { aluno: string; descricao: string; valor: number; metodo: string; dataPagamento: string | null }[];
};

export default function RelatorioFinanceiroPage() {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [filtros, setFiltros] = useState({ de: "", ate: "" });

  const qs = new URLSearchParams();
  if (filtros.de) qs.set("de", filtros.de);
  if (filtros.ate) qs.set("ate", filtros.ate);
  const { data, isLoading, isError } = useQuery<Resp>({
    queryKey: ["rel-financeiro", filtros],
    queryFn: () => fetchJson(`/api/relatorios/financeiro?${qs.toString()}`),
  });
  useReportError(isError);

  const { pageItems, page, setPage, totalPages, total } = usePagination(data?.linhas);
  const t = data?.totais;

  return (
    <div className="flex flex-col gap-6">
      <ReportHeader
        titulo="Relatório Financeiro"
        descricao="Recebimentos (cobranças e parcelas pagas), pendências e bolsas."
        csvName="relatorio-financeiro.csv"
        rows={data?.linhas}
      />

      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4 shadow-sm print:hidden">
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-[170px]" aria-label="De" />
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-[170px]" aria-label="Até" />
        <Button onClick={() => setFiltros({ de, ate })}>Aplicar</Button>
      </div>

      {isLoading ? (
        <div className="p-8">Carregando relatório...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Recebido no período" value={brl(t?.recebidoPeriodo ?? 0)} />
            <StatCard label="Pendente (a vencer)" value={brl(t?.pendente ?? 0)} />
            <StatCard label="Vencido" value={brl(t?.vencido ?? 0)} />
            <StatCard label="Bolsas ativas" value={t?.bolsasAtivas ?? 0} />
            <StatCard label="Σ % das bolsas" value={`${(t?.valorBolsas ?? 0).toLocaleString("pt-BR")}%`} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Recebido por mês</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.porMes ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: number) => brl(v)} contentStyle={tooltipStyle} />
                    <Bar name="Recebido" dataKey="recebido" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Recebido por método</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.porMetodo ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="metodo" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: number) => brl(v)} contentStyle={tooltipStyle} />
                    <Bar name="Recebido" dataKey="valor" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{l.aluno}</TableCell>
                    <TableCell>{l.descricao}</TableCell>
                    <TableCell>{brl(l.valor)}</TableCell>
                    <TableCell className="capitalize">{l.metodo}</TableCell>
                    <TableCell>{fmtData(l.dataPagamento)}</TableCell>
                  </TableRow>
                ))}
                {pageItems.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum recebimento no período.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationBar page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
