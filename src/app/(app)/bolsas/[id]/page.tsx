"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit } from "lucide-react";

export default function BolsaDetalhe() {
  const id = Number(useParams().id);
  const { data: b, isLoading } = useQuery<any>({
    queryKey: ["bolsa", id],
    queryFn: () => fetch(`/api/bolsas/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8">Carregando...</div>;
  if (!b || b.error) return <div className="p-8">Bolsa não encontrada.</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/bolsas"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bolsa — {b.alunoNome}</h1>
          <p className="text-muted-foreground capitalize">{b.tipo} · {b.percentual}%</p>
        </div>
        <Button className="ml-auto" asChild>
          <Link href={`/bolsas/${b.id}/editar`}><Edit className="w-4 h-4 mr-2" /> Editar</Link>
        </Button>
      </div>

      <Card className="max-w-xl">
        <CardHeader><CardTitle className="text-lg">Dados da bolsa</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Aluno</span><span className="font-medium">{b.alunoNome}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span className="font-medium capitalize">{b.tipo}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Percentual</span><span className="font-medium">{b.percentual}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Vigência</span><span className="font-medium">{b.dataInicio} {b.dataFim ? `→ ${b.dataFim}` : "→ —"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Motivo</span><span className="font-medium">{b.motivo || "—"}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Situação</span><Badge variant={b.ativo ? "default" : "secondary"}>{b.ativo ? "ativo" : "inativo"}</Badge></div>
        </CardContent>
      </Card>
    </div>
  );
}
