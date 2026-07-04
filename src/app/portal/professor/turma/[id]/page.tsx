"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type TurmaDetalhe = {
  turma: { id: number; nome: string; cursoNome: string };
  alunos: { id: number; nome: string }[];
  disciplinas: { id: number; nome: string }[];
};

type Aula = {
  id: number;
  disciplinaId: number;
  disciplinaNome: string | null;
  data: string | null;
  conteudo: string;
  observacoes: string | null;
};

type PresencaItem = {
  alunoId: number;
  alunoNome: string;
  status: "presente" | "falta" | "atraso" | "justificada";
  justificativa: string | null;
};

type Avaliacao = {
  id: number;
  disciplinaId: number;
  disciplinaNome: string | null;
  tipo: string;
  peso: number;
  data: string | null;
};

type LancamentoItem = { alunoId: number; alunoNome: string; valor: number | null };

const STATUS_OPTS: PresencaItem["status"][] = ["presente", "falta", "atraso", "justificada"];
const TIPOS = ["prova", "trabalho", "seminario", "atividade", "pratica", "recuperacao", "segunda_chamada"];
const hoje = () => new Date().toISOString().slice(0, 10);

async function jsonOrThrow(res: Response) {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
  return res.json();
}

export default function TurmaDetalhePage() {
  const params = useParams<{ id: string }>();
  const turmaId = Number(params.id);

  const { data, isLoading } = useQuery<TurmaDetalhe>({
    queryKey: ["portal-prof-turma", turmaId],
    queryFn: () => fetch(`/api/portal/professor/turma/${turmaId}`).then(jsonOrThrow),
    enabled: Number.isFinite(turmaId),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!data?.turma) return <p className="text-muted-foreground">Turma não encontrada ou sem acesso.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.turma.nome}</h1>
        <p className="text-muted-foreground">{data.turma.cursoNome}</p>
      </div>

      <Tabs defaultValue="alunos">
        <TabsList>
          <TabsTrigger value="alunos">Alunos</TabsTrigger>
          <TabsTrigger value="diario">Chamada/Diário</TabsTrigger>
          <TabsTrigger value="notas">Avaliações/Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="alunos">
          <AlunosTab alunos={data.alunos} />
        </TabsContent>
        <TabsContent value="diario">
          <DiarioTab turmaId={turmaId} disciplinas={data.disciplinas} />
        </TabsContent>
        <TabsContent value="notas">
          <NotasTab turmaId={turmaId} disciplinas={data.disciplinas} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AlunosTab({ alunos }: { alunos: TurmaDetalhe["alunos"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alunos ativos ({alunos.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Nome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alunos.length ? (
              alunos.map((a, i) => (
                <TableRow key={a.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{a.nome}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  Nenhum aluno ativo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DiarioTab({ turmaId, disciplinas }: { turmaId: number; disciplinas: TurmaDetalhe["disciplinas"] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [disciplinaId, setDisciplinaId] = useState("");
  const [data, setData] = useState(hoje());
  const [conteudo, setConteudo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [aulaId, setAulaId] = useState<number | null>(null);
  const [presencas, setPresencas] = useState<PresencaItem[]>([]);

  const aulas = useQuery<Aula[]>({
    queryKey: ["prof-aulas", turmaId],
    queryFn: () => fetch(`/api/aulas?turmaId=${turmaId}`).then(jsonOrThrow),
  });

  async function abrirChamada(id: number) {
    setAulaId(id);
    const items = await fetch(`/api/aulas/${id}/presencas`).then(jsonOrThrow);
    setPresencas(items);
  }

  const criarAula = useMutation({
    mutationFn: () =>
      fetch("/api/aulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turmaId, disciplinaId, data, conteudo, observacoes }),
      }).then(jsonOrThrow),
    onSuccess: async (aula: Aula) => {
      toast({ title: "Aula registrada" });
      setConteudo("");
      setObservacoes("");
      qc.invalidateQueries({ queryKey: ["prof-aulas", turmaId] });
      await abrirChamada(aula.id);
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar a aula.", variant: "destructive" }),
  });

  const salvarChamada = useMutation({
    mutationFn: () =>
      fetch(`/api/aulas/${aulaId}/presencas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          presencas.map((p) => ({ alunoId: p.alunoId, status: p.status, justificativa: p.justificativa })),
        ),
      }).then(jsonOrThrow),
    onSuccess: () => toast({ title: "Chamada salva" }),
    onError: () => toast({ title: "Erro", description: "Não foi possível salvar a chamada.", variant: "destructive" }),
  });

  const setStatus = (alunoId: number, status: PresencaItem["status"]) =>
    setPresencas((prev) => prev.map((p) => (p.alunoId === alunoId ? { ...p, status } : p)));
  const setJust = (alunoId: number, justificativa: string) =>
    setPresencas((prev) => prev.map((p) => (p.alunoId === alunoId ? { ...p, justificativa } : p)));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Registrar aula</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Disciplina</Label>
              <Select value={disciplinaId} onValueChange={setDisciplinaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinas.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Conteúdo ministrado</Label>
            <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <div>
            <Button
              onClick={() => criarAula.mutate()}
              disabled={!disciplinaId || !data || !conteudo || criarAula.isPending}
            >
              Registrar aula
            </Button>
          </div>
        </CardContent>
      </Card>

      {aulaId && (
        <Card>
          <CardHeader>
            <CardTitle>Chamada</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Presença</TableHead>
                  <TableHead>Justificativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presencas.map((p) => (
                  <TableRow key={p.alunoId}>
                    <TableCell>{p.alunoNome}</TableCell>
                    <TableCell>
                      <RadioGroup
                        className="flex flex-wrap gap-3"
                        value={p.status}
                        onValueChange={(v) => setStatus(p.alunoId, v as PresencaItem["status"])}
                      >
                        {STATUS_OPTS.map((s) => (
                          <div key={s} className="flex items-center gap-1.5">
                            <RadioGroupItem value={s} id={`p-${p.alunoId}-${s}`} />
                            <Label htmlFor={`p-${p.alunoId}-${s}`} className="text-xs capitalize">
                              {s}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={p.justificativa ?? ""}
                        onChange={(e) => setJust(p.alunoId, e.target.value)}
                        placeholder="—"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div>
              <Button onClick={() => salvarChamada.mutate()} disabled={salvarChamada.isPending}>
                Salvar chamada
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Aulas registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Disciplina</TableHead>
                <TableHead>Conteúdo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {aulas.data?.length ? (
                aulas.data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.data ?? "–"}</TableCell>
                    <TableCell>{a.disciplinaNome ?? "–"}</TableCell>
                    <TableCell className="max-w-xs truncate">{a.conteudo}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => abrirChamada(a.id)}>
                        Chamada
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    Nenhuma aula registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NotasTab({ turmaId, disciplinas }: { turmaId: number; disciplinas: TurmaDetalhe["disciplinas"] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [disciplinaId, setDisciplinaId] = useState("");
  const [tipo, setTipo] = useState("prova");
  const [peso, setPeso] = useState("1");
  const [data, setData] = useState(hoje());
  const [avaliacaoId, setAvaliacaoId] = useState<number | null>(null);
  const [lancamentos, setLancamentos] = useState<LancamentoItem[]>([]);

  const avaliacoes = useQuery<Avaliacao[]>({
    queryKey: ["prof-avaliacoes", turmaId],
    queryFn: () => fetch(`/api/avaliacoes?turmaId=${turmaId}`).then(jsonOrThrow),
  });

  async function abrirLancamentos(id: number) {
    setAvaliacaoId(id);
    const items = await fetch(`/api/avaliacoes/${id}/lancamentos`).then(jsonOrThrow);
    setLancamentos(items);
  }

  const criarAvaliacao = useMutation({
    mutationFn: () =>
      fetch("/api/avaliacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turmaId, disciplinaId, tipo, peso, data }),
      }).then(jsonOrThrow),
    onSuccess: () => {
      toast({ title: "Avaliação criada" });
      qc.invalidateQueries({ queryKey: ["prof-avaliacoes", turmaId] });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível criar a avaliação.", variant: "destructive" }),
  });

  const salvarNotas = useMutation({
    mutationFn: () =>
      fetch(`/api/avaliacoes/${avaliacaoId}/lancamentos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lancamentos.map((l) => ({ alunoId: l.alunoId, valor: l.valor }))),
      }).then(jsonOrThrow),
    onSuccess: () => toast({ title: "Notas salvas" }),
    onError: () => toast({ title: "Erro", description: "Não foi possível salvar as notas.", variant: "destructive" }),
  });

  const setValor = (alunoId: number, raw: string) => {
    const valor = raw === "" ? null : Math.max(0, Math.min(10, Number(raw)));
    setLancamentos((prev) => prev.map((l) => (l.alunoId === alunoId ? { ...l, valor } : l)));
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova avaliação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label>Disciplina</Label>
              <Select value={disciplinaId} onValueChange={setDisciplinaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinas.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Peso</Label>
              <Input type="number" min="0" step="0.5" value={peso} onChange={(e) => setPeso(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div>
            <Button onClick={() => criarAvaliacao.mutate()} disabled={!disciplinaId || criarAvaliacao.isPending}>
              Criar avaliação
            </Button>
          </div>
        </CardContent>
      </Card>

      {avaliacaoId && (
        <Card>
          <CardHeader>
            <CardTitle>Lançamento de notas (0–10)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="w-32">Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentos.map((l) => (
                  <TableRow key={l.alunoId}>
                    <TableCell>{l.alunoNome}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={l.valor ?? ""}
                        onChange={(e) => setValor(l.alunoId, e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div>
              <Button onClick={() => salvarNotas.mutate()} disabled={salvarNotas.isPending}>
                Salvar notas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Avaliações da turma</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Disciplina</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Peso</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {avaliacoes.data?.length ? (
                avaliacoes.data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.data ?? "–"}</TableCell>
                    <TableCell>{a.disciplinaNome ?? "–"}</TableCell>
                    <TableCell className="capitalize">{a.tipo}</TableCell>
                    <TableCell className="text-right">{a.peso}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => abrirLancamentos(a.id)}>
                        Notas
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Nenhuma avaliação.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
