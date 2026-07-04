"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin } from "lucide-react";

type Aviso = {
  id: number;
  titulo: string;
  conteudo: string;
  publico: string;
  fixado: boolean;
  criadoEm: string;
};

export function MuralWidget() {
  const { data } = useQuery<Aviso[]>({
    queryKey: ["avisos-feed"],
    queryFn: async () => {
      const res = await fetch("/api/avisos/feed");
      if (!res.ok) return []; // ponytail: tolera 401/erro sem quebrar o painel
      return res.json();
    },
  });

  const avisos = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mural de Avisos</CardTitle>
      </CardHeader>
      <CardContent>
        {avisos.length ? (
          <ul className="divide-y">
            {avisos.map((a) => (
              <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  {a.fixado && <Pin className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="font-medium text-sm">{a.titulo}</span>
                  {a.fixado && <Badge variant="secondary">Fixado</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.conteudo}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(a.criadoEm).toLocaleDateString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum aviso no momento.</p>
        )}
      </CardContent>
    </Card>
  );
}
