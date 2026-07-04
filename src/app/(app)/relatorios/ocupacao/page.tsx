"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";
import { ReportHeader, StatCard, fetchJson, tooltipStyle, useReportError } from "../report-ui";

type Resp = {
  totais: { turmasAtivas: number; vagasTotais: number; ocupadas: number; pctOcupacao: number };
  porCurso: { curso: string; vagas: number; ocupadas: number }[];
  linhas: { turma: string; curso: string; sala: string; professor: string; vagas: number; ocupadas: number; pct: number; status: string }[];
};

export default function RelatorioOcupacaoPage() {
  const { data, isLoading, isError } = useQuery<Resp>({
    queryKey: ["rel-ocupacao"],
    queryFn: () => fetchJson("/api/relatorios/ocupacao"),
  });
  useReportError(isError);

  const { pageItems, page, setPage, totalPages, total } = usePagination(data?.linhas);
  const t = data?.totais;

  return (
    <div className="flex flex-col gap-6">
      <ReportHeader
        titulo="Relatório de Ocupação"
        descricao="Vagas e ocupação das turmas em aberto (planejadas e em andamento)."
        csvName="relatorio-ocupacao.csv"
        rows={data?.linhas}
      />

      {isLoading ? (
        <div className="p-8">Carregando relatório...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Turmas em andamento" value={t?.turmasAtivas ?? 0} />
            <StatCard label="Vagas totais" value={t?.vagasTotais ?? 0} />
            <StatCard label="Vagas ocupadas" value={t?.ocupadas ?? 0} />
            <StatCard label="Ocupação" value={`${t?.pctOcupacao ?? 0}%`} />
          </div>

          <Card>
            <CardHeader><CardTitle>Vagas vs ocupadas por curso</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.porCurso ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="curso" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar name="Vagas" dataKey="vagas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar name="Ocupadas" dataKey="ocupadas" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Sala</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Vagas</TableHead>
                  <TableHead>Ocupadas</TableHead>
                  <TableHead>Ocupação</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{l.turma}</TableCell>
                    <TableCell>{l.curso}</TableCell>
                    <TableCell>{l.sala}</TableCell>
                    <TableCell>{l.professor}</TableCell>
                    <TableCell>{l.vagas}</TableCell>
                    <TableCell>{l.ocupadas}</TableCell>
                    <TableCell>{l.pct.toLocaleString("pt-BR")}%</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{l.status.replace("_", " ")}</Badge></TableCell>
                  </TableRow>
                ))}
                {pageItems.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Nenhuma turma em aberto.</TableCell></TableRow>
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
