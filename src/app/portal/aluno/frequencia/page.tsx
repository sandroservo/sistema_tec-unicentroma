"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type Freq = { turmaNome: string; disciplinaNome?: string; percentual: number; risco: boolean };

export default function FrequenciaPage() {
  const { data, isLoading } = useQuery<Freq[]>({
    queryKey: ["portal-frequencia"],
    queryFn: () => fetch("/api/portal/aluno/frequencia").then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Frequência</h1>
        <p className="text-muted-foreground">Presença por turma e disciplina. Risco abaixo de 75%.</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((f, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span>
                    {f.turmaNome}
                    {f.disciplinaNome ? ` · ${f.disciplinaNome}` : ""}
                  </span>
                  {f.risco && <Badge variant="destructive">Risco</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Progress value={f.percentual} />
                <span className="text-sm text-muted-foreground">{f.percentual.toFixed(0)}% de presença</span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Nenhum registro de frequência.</p>
      )}
    </div>
  );
}
