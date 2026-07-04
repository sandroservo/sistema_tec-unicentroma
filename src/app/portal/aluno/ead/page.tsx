"use client";

// TODO: link EAD no layout do portal
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

type CursoEad = {
  cursoId: number;
  cursoNome: string;
  totalAulas: number;
  aulasConcluidas: number;
  percentual: number;
};

export default function MeusCursosEadPage() {
  const { data, isLoading } = useQuery<CursoEad[]>({
    queryKey: ["portal-ead-cursos"],
    queryFn: () => fetch("/api/portal/aluno/ead/cursos").then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meus cursos EAD</h1>
        <p className="text-muted-foreground">Acompanhe seu progresso.</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : !data?.length ? (
        <p className="text-muted-foreground">Você não tem cursos EAD disponíveis.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Card key={c.cursoId}>
              <CardHeader>
                <CardTitle>{c.cursoNome}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Progress value={c.percentual} />
                <p className="text-sm text-muted-foreground">
                  {c.aulasConcluidas} de {c.totalAulas} aulas ({c.percentual}%)
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild size="sm">
                  <Link href={`/portal/aluno/ead/${c.cursoId}`}>Acessar</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
