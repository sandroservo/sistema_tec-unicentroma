"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlunoPdfActions } from "@/components/aluno-pdf-actions";

type Me = { alunoId: number; nome: string; matriculasAtivas: number };

export default function DocumentosPage() {
  const { data, isLoading } = useQuery<Me>({
    queryKey: ["portal-me"],
    queryFn: () => fetch("/api/portal/aluno/me").then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground">Emita seus documentos acadêmicos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emissão de documentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !data?.alunoId ? (
            <p className="text-muted-foreground text-sm">Carregando…</p>
          ) : (
            <AlunoPdfActions alunoId={data.alunoId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
