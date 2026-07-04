"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MuralWidget } from "@/components/mural-widget";

type Turma = {
  id: number;
  nome: string;
  cursoNome: string;
  totalAlunos: number;
  status: string;
  dataInicio: string | null;
};

export default function ProfessorInicio() {
  const { data, isLoading } = useQuery<Turma[]>({
    queryKey: ["portal-prof-turmas"],
    queryFn: () => fetch("/api/portal/professor/turmas").then((r) => r.json()),
  });

  const turmas = data ?? [];
  const totalAlunos = turmas.reduce((s, t) => s + t.totalAlunos, 0);

  const cards = [
    { label: "Minhas turmas", value: String(turmas.length) },
    { label: "Alunos", value: String(totalAlunos) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portal do Professor</h1>
        <p className="text-muted-foreground">Gerencie suas turmas, chamada e notas.</p>
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
          <CardTitle>Turmas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando…</p>
          ) : turmas.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {turmas.map((t) => (
                <Link
                  key={t.id}
                  href={`/portal/professor/turma/${t.id}`}
                  className="rounded-lg border bg-card p-4 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t.nome}</span>
                    <Badge variant="secondary">{t.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{t.cursoNome}</p>
                  <p className="text-sm text-muted-foreground mt-2">{t.totalAlunos} aluno(s)</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhuma turma vinculada.</p>
          )}
        </CardContent>
      </Card>

      <MuralWidget />
    </div>
  );
}
