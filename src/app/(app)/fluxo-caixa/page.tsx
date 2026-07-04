"use client";

// TODO: link no app-sidebar

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

type FluxoResp = {
  series: { mes: string; receita: number; despesa: number; saldo: number }[];
  totais: { totalReceita: number; totalDespesa: number; saldo: number };
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FluxoCaixaPage() {
  const { data, isLoading } = useQuery<FluxoResp>({
    queryKey: ["fluxo-caixa"],
    queryFn: () => fetch("/api/financeiro/fluxo-caixa").then((r) => r.json()),
  });

  if (isLoading) return <div className="p-8">Carregando fluxo de caixa...</div>;

  const t = data?.totais;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fluxo de Caixa</h1>
        <p className="text-muted-foreground">Receitas x despesas nos últimos 12 meses.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <TrendingUp className="h-6 w-6 text-foreground/80" />
            </div>
            <span className="mt-5 block text-sm text-muted-foreground">Receita (período)</span>
            <h4 className="mt-1 text-2xl font-semibold tracking-tight">{brl(t?.totalReceita ?? 0)}</h4>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <TrendingDown className="h-6 w-6 text-foreground/80" />
            </div>
            <span className="mt-5 block text-sm text-muted-foreground">Despesa (período)</span>
            <h4 className="mt-1 text-2xl font-semibold tracking-tight">{brl(t?.totalDespesa ?? 0)}</h4>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Wallet className="h-6 w-6 text-foreground/80" />
            </div>
            <span className="mt-5 block text-sm text-muted-foreground">Saldo (período)</span>
            <h4 className={`mt-1 text-2xl font-semibold tracking-tight ${(t?.saldo ?? 0) < 0 ? "text-destructive" : ""}`}>
              {brl(t?.saldo ?? 0)}
            </h4>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receita vs Despesa</CardTitle>
          <CardDescription>Comparativo mensal.</CardDescription>
        </CardHeader>
        <CardContent className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.series ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                formatter={(v: number) => brl(v)}
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
              />
              <Legend />
              <Bar name="Receita" dataKey="receita" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar name="Despesa" dataKey="despesa" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
