"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Disc = {
  periodo: number | null;
  disciplinaNome: string;
  cargaHoraria: number;
  obrigatoria: boolean;
};

export default function GradePage() {
  const { data, isLoading } = useQuery<Disc[]>({
    queryKey: ["portal-grade"],
    queryFn: () => fetch("/api/portal/aluno/grade").then((r) => r.json()),
  });

  const grupos = new Map<string, Disc[]>();
  for (const d of data ?? []) {
    const k = d.periodo != null ? `${d.periodo}º período` : "Sem período";
    (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(d);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Grade Curricular</h1>
        <p className="text-muted-foreground">Disciplinas do(s) seu(s) curso(s).</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : grupos.size ? (
        [...grupos].map(([periodo, discs]) => (
          <Card key={periodo}>
            <CardHeader>
              <CardTitle className="text-lg">{periodo}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {discs.map((d) => (
                  <li key={d.disciplinaNome} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{d.disciplinaNome}</span>
                      {!d.obrigatoria && <Badge variant="outline">optativa</Badge>}
                    </div>
                    <span className="text-sm text-muted-foreground">{d.cargaHoraria}h</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-muted-foreground text-sm">Nenhuma disciplina encontrada.</p>
      )}
    </div>
  );
}
