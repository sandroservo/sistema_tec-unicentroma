"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MuralWidget } from "@/components/mural-widget";

type Me = { responsavelId: number; nome: string; alunos: { id: number; nome: string }[] };

export default function PortalResponsavelHome() {
  const { data, isLoading } = useQuery<Me>({
    queryKey: ["portal-responsavel-me"],
    queryFn: () => fetch("/api/portal/responsavel/me").then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meus filhos</h1>
        <p className="text-muted-foreground">Acompanhe o desempenho de cada aluno vinculado à sua conta.</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : data?.alunos?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.alunos.map((a) => (
            <Card key={a.id} className="p-6 flex flex-col gap-4">
              <div className="font-medium text-lg">{a.nome}</div>
              <Button asChild className="mt-auto">
                <Link href={`/portal/responsavel/aluno/${a.id}`}>Ver detalhes</Link>
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Nenhum aluno vinculado à sua conta. Procure a secretaria.
        </div>
      )}

      <MuralWidget />
    </div>
  );
}
