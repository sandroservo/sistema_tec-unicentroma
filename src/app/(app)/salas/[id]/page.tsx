"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Building2, Users, Layers, Wrench } from "lucide-react";

type Sala = {
  id: number;
  nome: string;
  bloco: string | null;
  capacidade: number;
  tipo: string;
  recursos: string | null;
  ativo: boolean;
};

export default function SalaDetalhe() {
  const id = Number(useParams().id);
  const { data: s, isLoading } = useQuery<Sala>({
    queryKey: ["sala", id],
    queryFn: () => fetch(`/api/salas/${id}`).then((res) => res.json()),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8">Carregando…</div>;
  if (!s || (s as { error?: string }).error) return <div className="p-8">Sala não encontrada.</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/salas"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{s.nome}</h1>
          <Badge variant={s.ativo ? "default" : "secondary"}>{s.ativo ? "Ativa" : "Inativa"}</Badge>
        </div>
        <Button className="ml-auto" asChild>
          <Link href={`/salas/${s.id}/editar`}>
            <Edit className="w-4 h-4 mr-2" /> Editar
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Localização e capacidade</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Building2 className="w-4 h-4" /> Bloco</div>
              <p className="font-medium">{s.bloco || "—"}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Users className="w-4 h-4" /> Capacidade</div>
              <p className="font-medium">{s.capacidade}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Layers className="w-4 h-4" /> Tipo</div>
              <p className="font-medium capitalize">{s.tipo}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Wrench className="w-5 h-5" /> Recursos</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{s.recursos || "Nenhum recurso cadastrado."}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
