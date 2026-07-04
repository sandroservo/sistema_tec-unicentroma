"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Evento = {
  id: number;
  titulo: string;
  tipo: string;
  dataInicio: string | null;
  dataFim: string | null;
  descricao: string | null;
};

export default function CalendarioPage() {
  const { data, isLoading } = useQuery<Evento[]>({
    queryKey: ["portal-calendario"],
    queryFn: () => fetch("/api/portal/aluno/calendario").then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
        <p className="text-muted-foreground">Próximos eventos.</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : data?.length ? (
        <div className="flex flex-col gap-3">
          {data.map((e) => (
            <Card key={e.id} className="p-4 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{e.tipo}</Badge>
                  <span className="font-medium">{e.titulo}</span>
                </div>
                {e.descricao && <span className="text-sm text-muted-foreground">{e.descricao}</span>}
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {e.dataInicio}
                {e.dataFim && e.dataFim !== e.dataInicio ? ` – ${e.dataFim}` : ""}
              </span>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Nenhum evento futuro.</p>
      )}
    </div>
  );
}
