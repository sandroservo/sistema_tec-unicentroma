"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, GraduationCap, User, Clock, Calendar, FileText } from "lucide-react";

type Disciplina = {
  id: number;
  nome: string;
  descricao: string | null;
  cargaHoraria: number;
  cursoId: number;
  professorId: number | null;
  periodo: number | null;
  obrigatoria: boolean;
  cursoNome: string | null;
  professorNome: string | null;
};

export default function DisciplinaDetalhe() {
  const id = Number(useParams().id);
  const { data: d, isLoading } = useQuery<Disciplina>({
    queryKey: ["disciplina", id],
    queryFn: () => fetch(`/api/disciplinas/${id}`).then((res) => res.json()),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8">Carregando…</div>;
  if (!d || (d as { error?: string }).error) return <div className="p-8">Disciplina não encontrada.</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/disciplinas"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{d.nome}</h1>
          <Badge variant={d.obrigatoria ? "default" : "secondary"}>{d.obrigatoria ? "Obrigatória" : "Optativa"}</Badge>
        </div>
        <Button className="ml-auto" asChild>
          <Link href={`/disciplinas/${d.id}/editar`}>
            <Edit className="w-4 h-4 mr-2" /> Editar
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Dados da disciplina</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><GraduationCap className="w-4 h-4" /> Curso</div>
              <p className="font-medium">{d.cursoNome || "—"}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><User className="w-4 h-4" /> Professor Padrão</div>
              <p className="font-medium">{d.professorNome || "Não definido"}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Clock className="w-4 h-4" /> Carga Horária</div>
              <p className="font-medium">{d.cargaHoraria}h</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Calendar className="w-4 h-4" /> Período</div>
              <p className="font-medium">{d.periodo ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Descrição</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{d.descricao || "Sem descrição."}</p>
            <Button variant="outline" asChild>
              <Link href={`/disciplinas/${d.id}/plano`}>
                <FileText className="w-4 h-4 mr-2" /> Plano de ensino
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
