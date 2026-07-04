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
import { ReportHeader, StatCard, fetchJson, fmtData, tooltipStyle, useReportError } from "../report-ui";

type Curso = { id: number; nome: string };
type Resp = {
  totais: { matriculasPeriodo: number; alunosAtivos: number; aprovados: number; reprovados: number; emCurso: number; evasao: number };
  porCurso: { curso: string; matriculas: number }[];
  linhas: { aluno: string; curso: string; turma: string; status: string; dataMatricula: string | null; media: number | null; situacao: string }[];
};

export default function RelatorioAcademicoPage() {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [filtros, setFiltros] = useState({ de: "", ate: "", cursoId: "" });

  const { data: cursos } = useQuery<Curso[]>({ queryKey: ["cursos"], queryFn: () => fetchJson("/api/cursos") });

  const qs = new URLSearchParams();
  if (filtros.de) qs.set("de", filtros.de);
  if (filtros.ate) qs.set("ate", filtros.ate);
  if (filtros.cursoId) qs.set("cursoId", filtros.cursoId);
  const { data, isLoading, isError } = useQuery<Resp>({
    queryKey: ["rel-academico", filtros],
    queryFn: () => fetchJson(`/api/relatorios/academico?${qs.toString()}`),
  });
  useReportError(isError);

  const { pageItems, page, setPage, totalPages, total } = usePagination(data?.linhas);
  const t = data?.totais;

  return (
    <div className="flex flex-col gap-6">
      <ReportHeader
        titulo="Relatório Acadêmico"
        descricao="Matrículas, aprovação e evasão por período e curso."
        csvName="relatorio-academico.csv"
        rows={data?.linhas}
      />

      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4 shadow-sm print:hidden">
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-[170px]" aria-label="De" />
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-[170px]" aria-label="Até" />
        <Select value={cursoId} onValueChange={(v) => setCursoId(v === "todos" ? "" : v)}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todos os cursos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os cursos</SelectItem>
            {cursos?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setFiltros({ de, ate, cursoId })}>Aplicar</Button>
      </div>

      {isLoading ? (
        <div className="p-8">Carregando relatório...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Matrículas no período" value={t?.matriculasPeriodo ?? 0} />
            <StatCard label="Alunos ativos" value={t?.alunosAtivos ?? 0} />
            <StatCard label="Aprovados" value={t?.aprovados ?? 0} />
            <StatCard label="Reprovados" value={t?.reprovados ?? 0} />
            <StatCard label="Em curso" value={t?.emCurso ?? 0} />
            <StatCard label="Evasão" value={t?.evasao ?? 0} />
          </div>

          <Card>
            <CardHeader><CardTitle>Matrículas por curso</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.porCurso ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="curso" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} />
                  <Bar name="Matrículas" dataKey="matriculas" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Média</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{l.aluno}</TableCell>
                    <TableCell>{l.curso}</TableCell>
                    <TableCell>{l.turma}</TableCell>
                    <TableCell className="capitalize">{l.status}</TableCell>
                    <TableCell>{fmtData(l.dataMatricula)}</TableCell>
                    <TableCell>{l.media != null ? l.media.toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={l.situacao === "reprovado" ? "destructive" : "secondary"} className="capitalize">
                        {l.situacao}
                      </Badge>
                    </TableCell>
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
