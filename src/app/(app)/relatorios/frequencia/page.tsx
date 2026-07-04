"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";
import { ReportHeader, StatCard, fetchJson, tooltipStyle, useReportError } from "../report-ui";

type Turma = { id: number; nome: string };
type Resp = {
  totais: { turmas: number; alunosRisco: number; mediaGeralPct: number };
  porTurma: { turma: string; curso: string; pct: number }[];
  linhas: { aluno: string; turma: string; totalAulas: number; presencas: number; faltas: number; pct: number; risco: boolean }[];
};

export default function RelatorioFrequenciaPage() {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [filtros, setFiltros] = useState({ de: "", ate: "", turmaId: "" });

  const { data: turmas } = useQuery<Turma[]>({ queryKey: ["turmas"], queryFn: () => fetchJson("/api/turmas") });

  const qs = new URLSearchParams();
  if (filtros.de) qs.set("de", filtros.de);
  if (filtros.ate) qs.set("ate", filtros.ate);
  if (filtros.turmaId) qs.set("turmaId", filtros.turmaId);
  const { data, isLoading, isError } = useQuery<Resp>({
    queryKey: ["rel-frequencia", filtros],
    queryFn: () => fetchJson(`/api/relatorios/frequencia?${qs.toString()}`),
  });
  useReportError(isError);

  const { pageItems, page, setPage, totalPages, total } = usePagination(data?.linhas);
  const t = data?.totais;

  return (
    <div className="flex flex-col gap-6">
      <ReportHeader
        titulo="Relatório de Frequência"
        descricao="Presenças por turma e alunos em risco (frequência abaixo de 75%)."
        csvName="relatorio-frequencia.csv"
        rows={data?.linhas}
      />

      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4 shadow-sm print:hidden">
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-[170px]" aria-label="De" />
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-[170px]" aria-label="Até" />
        <Select value={turmaId} onValueChange={(v) => setTurmaId(v === "todas" ? "" : v)}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todas as turmas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as turmas</SelectItem>
            {turmas?.map((tu) => <SelectItem key={tu.id} value={String(tu.id)}>{tu.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setFiltros({ de, ate, turmaId })}>Aplicar</Button>
      </div>

      {isLoading ? (
        <div className="p-8">Carregando relatório...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Turmas com aulas no período" value={t?.turmas ?? 0} />
            <StatCard label="Alunos em risco (<75%)" value={t?.alunosRisco ?? 0} />
            <StatCard label="Frequência média geral" value={`${t?.mediaGeralPct ?? 0}%`} />
          </div>

          <Card>
            <CardHeader><CardTitle>Frequência média por turma</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.porTurma ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="turma" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: number) => `${v}%`} contentStyle={tooltipStyle} />
                  <Bar name="Frequência" dataKey="pct" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Aulas</TableHead>
                  <TableHead>Presenças</TableHead>
                  <TableHead>Faltas</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Risco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{l.aluno}</TableCell>
                    <TableCell>{l.turma}</TableCell>
                    <TableCell>{l.totalAulas}</TableCell>
                    <TableCell>{l.presencas}</TableCell>
                    <TableCell>{l.faltas}</TableCell>
                    <TableCell>{l.pct.toLocaleString("pt-BR")}%</TableCell>
                    <TableCell>{l.risco ? <Badge variant="destructive">Em risco</Badge> : <Badge variant="secondary">OK</Badge>}</TableCell>
                  </TableRow>
                ))}
                {pageItems.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum registro no período.</TableCell></TableRow>
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
