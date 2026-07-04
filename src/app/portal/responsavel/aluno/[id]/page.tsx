"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

type Painel = {
  aluno: { nome: string };
  notas: { disciplinaNome: string; media: number | null; situacao: string }[];
  frequencia: { turmaNome: string; disciplinaNome: string; percentual: number; risco: boolean }[];
  financeiro: { id: number; descricao: string; valor: number; vencimento: string | null; dataPagamento: string | null; status: string }[];
  ocorrencias: { tipo: string; gravidade: string; descricao: string; data: string | null }[];
  requerimentos: { protocolo: string; tipo: string; status: string; criadoEm: string }[];
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PainelAlunoResponsavel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError } = useQuery<Painel>({
    queryKey: ["portal-responsavel-aluno", id],
    queryFn: () => fetch(`/api/portal/responsavel/aluno/${id}`).then((r) => {
      if (!r.ok) throw new Error("erro");
      return r.json();
    }),
    retry: false,
  });

  if (isError)
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Você não tem acesso a este aluno.
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/portal/responsavel">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data?.aluno.nome ?? "Aluno"}</h1>
          <p className="text-muted-foreground">Painel de acompanhamento (somente leitura).</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (
        <Tabs defaultValue="notas">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="notas">Notas</TabsTrigger>
            <TabsTrigger value="frequencia">Frequência</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
            <TabsTrigger value="requerimentos">Requerimentos</TabsTrigger>
          </TabsList>

          <TabsContent value="notas">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Disciplina</TableHead>
                    <TableHead className="text-right">Média</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.notas.length ? (
                    data.notas.map((n) => (
                      <TableRow key={n.disciplinaNome}>
                        <TableCell className="font-medium">{n.disciplinaNome}</TableCell>
                        <TableCell className="text-right">{n.media != null ? n.media.toFixed(1) : "–"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{n.situacao}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        Nenhuma nota lançada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="frequencia">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead className="text-right">Frequência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.frequencia.length ? (
                    data.frequencia.map((f) => (
                      <TableRow key={`${f.turmaNome}|${f.disciplinaNome}`}>
                        <TableCell>{f.turmaNome}</TableCell>
                        <TableCell className="font-medium">{f.disciplinaNome}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={f.risco ? "destructive" : "secondary"}>{f.percentual.toFixed(0)}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        Sem registros de frequência.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="financeiro">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.financeiro.length ? (
                    data.financeiro.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.descricao}</TableCell>
                        <TableCell className="text-right">{brl(c.valor)}</TableCell>
                        <TableCell>{c.vencimento ?? "–"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{c.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Nenhuma cobrança.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="ocorrencias">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Gravidade</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.ocorrencias.length ? (
                    data.ocorrencias.map((o, i) => (
                      <TableRow key={i}>
                        <TableCell>{o.data ?? "–"}</TableCell>
                        <TableCell className="font-medium">{o.tipo}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{o.gravidade}</Badge>
                        </TableCell>
                        <TableCell>{o.descricao}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Nenhuma ocorrência.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="requerimentos">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.requerimentos.length ? (
                    data.requerimentos.map((r) => (
                      <TableRow key={r.protocolo}>
                        <TableCell className="font-mono text-sm">{r.protocolo}</TableCell>
                        <TableCell>{r.tipo}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(r.criadoEm).toLocaleDateString("pt-BR")}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Nenhum requerimento.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
