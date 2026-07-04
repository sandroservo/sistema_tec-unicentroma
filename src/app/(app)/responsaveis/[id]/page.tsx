"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Mail, Phone, CreditCard, Users } from "lucide-react";

type Responsavel = {
  id: number;
  nome: string;
  email: string;
  cpf: string | null;
  telefone: string | null;
  parentesco: string;
  alunos: { id: number; nome: string }[];
};

const PARENTESCO: Record<string, string> = { pai: "Pai", mae: "Mãe", responsavel: "Responsável" };

export default function ResponsavelDetalhe() {
  const id = Number(useParams().id);
  const { data: r, isLoading } = useQuery<Responsavel>({
    queryKey: ["responsavel", id],
    queryFn: () => fetch(`/api/responsaveis/${id}`).then((res) => res.json()),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8">Carregando…</div>;
  if (!r || (r as { error?: string }).error) return <div className="p-8">Responsável não encontrado.</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/responsaveis"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{r.nome}</h1>
          <p className="text-muted-foreground">{PARENTESCO[r.parentesco] ?? r.parentesco}</p>
        </div>
        <Button className="ml-auto" asChild>
          <Link href={`/responsaveis/${r.id}/editar`}>
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
              <p className="font-medium">{r.email}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Phone className="w-4 h-4" /> Telefone</div>
              <p className="font-medium">{r.telefone || "—"}</p>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><CreditCard className="w-4 h-4" /> CPF</div>
              <p className="font-medium">{r.cpf || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Alunos vinculados</CardTitle>
          </CardHeader>
          <CardContent>
            {r.alunos.length ? (
              <div className="flex flex-col gap-2">
                {r.alunos.map((a) => (
                  <Link key={a.id} href={`/alunos/${a.id}`} className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted">
                    <span className="font-medium">{a.nome}</span>
                    <Badge variant="secondary">ver aluno</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum aluno vinculado.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
