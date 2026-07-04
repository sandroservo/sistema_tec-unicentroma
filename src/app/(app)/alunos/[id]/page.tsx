"use client";

import { useParams } from "next/navigation";
import { useGetAluno, getGetAlunoQueryKey } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, CreditCard, FileText } from "lucide-react";
import Link from "next/link";
import { AlunoPdfActions } from "@/components/aluno-pdf-actions";

export default function AlunoDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { data: aluno, isLoading } = useGetAluno(id, {
    query: { enabled: !!id, queryKey: getGetAlunoQueryKey(id) },
  });

  if (isLoading) {
    return <div className="p-8">Carregando detalhes do aluno...</div>;
  }

  if (!aluno) {
    return <div className="p-8">Aluno não encontrado.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/alunos"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{aluno.nome}</h1>
          <p className="text-muted-foreground">ID: {aluno.id} • Cadastrado em {new Date(aluno.criadoEm).toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="ml-auto">
          <Badge variant={aluno.status === 'ativo' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
            {aluno.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" /> Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4" /> CPF
              </div>
              <p className="font-medium">{aluno.cpf}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4" /> Email
              </div>
              <p className="font-medium">{aluno.email}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4" /> Telefone
              </div>
              <p className="font-medium">{aluno.telefone || "-"}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4" /> Data de Nascimento
              </div>
              <p className="font-medium">{aluno.dataNascimento ? new Date(aluno.dataNascimento).toLocaleDateString('pt-BR') : "-"}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4" /> Endereço
              </div>
              <p className="font-medium">{aluno.endereco || "-"}</p>
              <p className="text-sm">{aluno.cidade} {aluno.estado ? `- ${aluno.estado}` : ""}</p>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Matrículas e Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground text-center py-8">
                Histórico será implementado em breve.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" /> Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AlunoPdfActions alunoId={aluno.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground text-center py-8">
                Resumo financeiro do aluno será implementado em breve.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
