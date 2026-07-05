"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useGetCurso, getGetCursoQueryKey } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Clock, MapPin, DollarSign, FileText } from "lucide-react";

export default function CursoDetalhe() {
  const id = Number(useParams().id);
  const { data: curso, isLoading } = useGetCurso(id, {
    query: { enabled: !!id, queryKey: getGetCursoQueryKey(id) },
  });

  if (isLoading) return <div className="p-8">Carregando...</div>;
  if (!curso) return <div className="p-8">Curso não encontrado.</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/cursos"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{curso.nome}</h1>
          <p className="text-muted-foreground capitalize">{curso.modalidade}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={curso.status === "ativo" ? "default" : "secondary"}>{curso.status}</Badge>
          <Button asChild>
            <Link href={`/cursos/${curso.id}/editar`}>
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Detalhes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Clock className="w-4 h-4" /> Carga Horária</div>
              <p className="font-medium">{curso.cargaHoraria} horas</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><MapPin className="w-4 h-4" /> Área</div>
              <p className="font-medium">{curso.area || "Geral"}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4" /> Valor</div>
              <p className="font-medium">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(curso.valor))}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{curso.descricao || "Sem descrição."}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
