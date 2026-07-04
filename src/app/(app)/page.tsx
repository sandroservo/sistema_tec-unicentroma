"use client";

import { useGetDashboardSummary, useGetMatriculasPorMes, useGetReceitaPorMes, useGetCursosPopulares, useGetAtividadesRecentes } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, GraduationCap, DollarSign, Activity, type LucideIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { MuralWidget } from "@/components/mural-widget";

// Stat card estilo TailAdmin: ícone em tile, valor grande, sub-info em badge.
function StatCard({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: React.ReactNode; sub: string }) {
  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-6 w-6 text-foreground/80" />
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-sm text-muted-foreground">{label}</span>
            <h4 className="mt-1 text-2xl font-semibold tracking-tight">{value}</h4>
          </div>
          <Badge variant="secondary" className="font-normal text-muted-foreground">{sub}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: matriculas } = useGetMatriculasPorMes();
  const { data: receita } = useGetReceitaPorMes();
  const { data: populares } = useGetCursosPopulares();
  const { data: atividades } = useGetAtividadesRecentes();

  if (loadingSummary) {
    return <div className="p-8">Carregando dashboard...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground">Resumo do sistema ERP Escola Técnica.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
        <StatCard icon={Users} label="Total de Alunos" value={summary?.totalAlunos || 0} sub={`${summary?.alunosAtivos || 0} ativos`} />
        <StatCard
          icon={DollarSign}
          label="Receita no Mês"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.receitaMesAtual || 0)}
          sub={`${summary?.inadimplentes || 0} inadimplentes`}
        />
        <StatCard icon={BookOpen} label="Turmas em Andamento" value={summary?.turmasEmAndamento || 0} sub={`${summary?.totalCursos || 0} cursos`} />
        <StatCard icon={GraduationCap} label="Professores" value={summary?.totalProfessores || 0} sub="na instituição" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Matrículas por Mês</CardTitle>
            <CardDescription>Evolução de novas matrículas no último ano.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matriculas || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{fill: 'hsl(var(--muted))'}}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Receita por Mês</CardTitle>
            <CardDescription>Comparativo de recebimentos e pendências.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={receita || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Line type="monotone" dataKey="recebido" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pendente" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cursos Mais Populares</CardTitle>
            <CardDescription>Cursos com maior número de matrículas ativas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {populares?.map((curso) => (
                <div key={curso.cursoId} className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-none">{curso.nome}</p>
                    <p className="text-xs text-muted-foreground capitalize">{curso.modalidade}</p>
                  </div>
                  <div className="font-medium text-sm">
                    {curso.totalMatriculas} alunos
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>Últimas ações realizadas no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {atividades?.slice(0, 5).map((atividade) => (
                <div key={atividade.id} className="flex items-start">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3 mt-0.5">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm leading-snug">{atividade.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(atividade.criadoEm).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <MuralWidget />
    </div>
  );
}
