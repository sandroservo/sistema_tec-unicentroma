"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useGetProfessor, getGetProfessorQueryKey } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Mail, Phone, CreditCard, GraduationCap, BookOpen } from "lucide-react";

export default function ProfessorDetalhe() {
  const id = Number(useParams().id);
  const { data: p, isLoading } = useGetProfessor(id, {
    query: { enabled: !!id, queryKey: getGetProfessorQueryKey(id) },
  });

  if (isLoading) return <div className="p-8">Carregando…</div>;
  if (!p || (p as { error?: string }).error) return <div className="p-8">Professor não encontrado.</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/professores"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{p.nome}</h1>
          <Badge variant={p.status === "ativo" ? "default" : "secondary"}>{p.status}</Badge>
        </div>
        <Button className="ml-auto" asChild>
          <Link href={`/professores/${p.id}/editar`}>
            <Edit className="w-4 h-4 mr-2" /> Editar
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Dados de contato</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Mail className="w-4 h-4" /> Email</div>
              <p className="font-medium">{p.email}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Phone className="w-4 h-4" /> Telefone</div>
              <p className="font-medium">{p.telefone || "—"}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><CreditCard className="w-4 h-4" /> CPF</div>
              <p className="font-medium">{p.cpf || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Formação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><BookOpen className="w-4 h-4" /> Especialidade</div>
              <p className="font-medium">{p.especialidade || "—"}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><GraduationCap className="w-4 h-4" /> Titulação</div>
              <p className="font-medium capitalize">{p.titulacao || "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
