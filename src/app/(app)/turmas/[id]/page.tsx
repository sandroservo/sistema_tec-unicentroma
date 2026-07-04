"use client";

import { useParams } from "next/navigation";
import { useGetTurma, useGetTurmaAlunos, getGetTurmaQueryKey, getGetTurmaAlunosQueryKey } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, GraduationCap, Calendar, Clock, Users } from "lucide-react";
import Link from "next/link";

export default function TurmaDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { data: turma, isLoading: loadingTurma } = useGetTurma(id, {
    query: { enabled: !!id, queryKey: getGetTurmaQueryKey(id) },
  });
  const { data: alunos, isLoading: loadingAlunos } = useGetTurmaAlunos(id, {
    query: { enabled: !!id, queryKey: getGetTurmaAlunosQueryKey(id) },
  });

  if (loadingTurma) {
    return <div className="p-8">Carregando detalhes da turma...</div>;
  }

  if (!turma) {
    return <div className="p-8">Turma não encontrada.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/turmas"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{turma.nome}</h1>
          <p className="text-muted-foreground">{turma.cursoNome}</p>
        </div>
        <div className="ml-auto">
          <Badge variant={turma.status === 'em_andamento' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
            {turma.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4" /> Curso
              </div>
              <p className="font-medium">{turma.cursoNome}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                <GraduationCap className="w-4 h-4" /> Professor
              </div>
              <p className="font-medium">{turma.professorNome || "Não atribuído"}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4" /> Período
              </div>
              <p className="font-medium">
                {new Date(turma.dataInicio).toLocaleDateString('pt-BR')}
                {turma.dataFim && ` até ${new Date(turma.dataFim).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4" /> Horário
              </div>
              <p className="font-medium">{turma.horario || "-"}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                <Users className="w-4 h-4" /> Ocupação
              </div>
              <p className="font-medium">{turma.vagasOcupadas} de {turma.vagas} vagas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Alunos Matriculados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Status da Matrícula</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAlunos ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">Carregando alunos...</TableCell>
                  </TableRow>
                ) : alunos && alunos.length > 0 ? (
                  alunos.map((aluno: any) => (
                    <TableRow key={aluno.id}>
                      <TableCell className="font-medium">
                        <Link href={`/alunos/${aluno.id}`} className="text-primary hover:underline">
                          {aluno.nome}
                        </Link>
                      </TableCell>
                      <TableCell>{aluno.cpf}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{aluno.status || "Ativo"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Nenhum aluno matriculado nesta turma.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
