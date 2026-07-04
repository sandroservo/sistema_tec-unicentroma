"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MuralWidget } from "@/components/mural-widget";

type Resumo = {
  mediaGeral: number | null;
  frequenciaGeral: number | null;
  saldoDevedor: number;
  matriculasAtivas: number;
  proximosEventos: { id: number; titulo: string; tipo: string; dataInicio: string | null }[];
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PortalInicio() {
  const { data, isLoading } = useQuery<Resumo>({
    queryKey: ["portal-resumo"],
    queryFn: () => fetch("/api/portal/aluno/resumo").then((r) => r.json()),
  });

  const cards = [
    { label: "Matrículas ativas", value: data ? String(data.matriculasAtivas) : "–" },
    { label: "Média geral", value: data?.mediaGeral != null ? data.mediaGeral.toFixed(1) : "–" },
    {
      label: "Frequência geral",
      value: data?.frequenciaGeral != null ? `${data.frequenciaGeral.toFixed(0)}%` : "–",
    },
    { label: "Saldo devedor", value: data ? brl(data.saldoDevedor) : "–" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meu Portal</h1>
        <p className="text-muted-foreground">Resumo da sua vida acadêmica.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{isLoading ? "…" : c.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximos eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando…</p>
          ) : data?.proximosEventos.length ? (
            <ul className="divide-y">
              {data.proximosEventos.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{e.tipo}</Badge>
                    <span className="text-sm">{e.titulo}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{e.dataInicio}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhum evento futuro.</p>
          )}
        </CardContent>
      </Card>

      <MuralWidget />
    </div>
  );
}
