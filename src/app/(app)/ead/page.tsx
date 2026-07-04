"use client";

// TODO: link no app-sidebar (EAD)
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Curso = { id: number; nome: string };

export default function EadCursosPage() {
  const { data, isLoading } = useQuery<Curso[]>({
    queryKey: ["cursos"],
    queryFn: () => fetch("/api/cursos").then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">EAD — Conteúdo</h1>
        <p className="text-muted-foreground">Gerencie módulos e aulas dos cursos.</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle>{c.nome}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm">
                  <Link href={`/ead/${c.id}`}>Gerenciar conteúdo</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {!data?.length && <p className="text-muted-foreground">Nenhum curso encontrado.</p>}
        </div>
      )}
    </div>
  );
}
