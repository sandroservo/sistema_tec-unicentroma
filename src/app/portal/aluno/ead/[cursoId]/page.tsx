"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle } from "lucide-react";

type Aula = {
  id: number;
  titulo: string;
  tipo: string;
  url: string | null;
  conteudo: string | null;
  concluido: boolean;
};
type Modulo = { id: number; titulo: string; descricao: string | null; aulas: Aula[] };

export default function PlayerPage() {
  const cursoId = Number(useParams().cursoId);
  const [aulaSel, setAulaSel] = useState<Aula | null>(null);

  const { data: modulos, isLoading } = useQuery<Modulo[]>({
    queryKey: ["portal-ead-curso", cursoId],
    queryFn: () => fetch(`/api/portal/aluno/ead/curso/${cursoId}`).then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Curso EAD</h1>

      <Tabs defaultValue="conteudo">
        <TabsList>
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="forum">Fórum</TabsTrigger>
        </TabsList>

        <TabsContent value="conteudo">
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div>
              {isLoading ? (
                <p className="text-muted-foreground">Carregando…</p>
              ) : (
                <Accordion type="multiple" className="flex flex-col gap-2">
                  {modulos?.map((m) => (
                    <AccordionItem key={m.id} value={String(m.id)} className="border rounded-lg px-3 bg-card">
                      <AccordionTrigger>{m.titulo}</AccordionTrigger>
                      <AccordionContent className="flex flex-col gap-2">
                        <ul className="flex flex-col gap-1">
                          {m.aulas.map((a) => (
                            <li key={a.id}>
                              <button
                                className="flex items-center gap-2 w-full text-left text-sm hover:underline"
                                onClick={() => setAulaSel(a)}
                              >
                                {a.concluido ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                                {a.titulo}
                              </button>
                            </li>
                          ))}
                        </ul>
                        <Quizzes moduloId={m.id} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>

            <div>
              {aulaSel ? (
                <AulaView cursoId={cursoId} aula={aulaSel} onProgress={() => setAulaSel({ ...aulaSel, concluido: true })} />
              ) : (
                <p className="text-muted-foreground">Selecione uma aula.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="forum">
          <Forum cursoId={cursoId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AulaView({ cursoId, aula, onProgress }: { cursoId: number; aula: Aula; onProgress: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const concluir = useMutation({
    mutationFn: () =>
      fetch("/api/portal/aluno/ead/progresso", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aulaId: aula.id, concluido: true }),
      }).then((r) => {
        if (!r.ok) throw new Error();
      }),
    onSuccess: () => {
      toast({ title: "Aula concluída" });
      onProgress();
      qc.invalidateQueries({ queryKey: ["portal-ead-curso", cursoId] });
    },
    onError: () => toast({ title: "Erro ao salvar progresso", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {aula.titulo}
          <Badge variant="outline">{aula.tipo}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {(aula.tipo === "video" || aula.tipo === "link") && aula.url && (
          <div className="aspect-video">
            <iframe src={aula.url} className="w-full h-full rounded border" allowFullScreen />
          </div>
        )}
        {aula.tipo === "pdf" && aula.url && (
          <>
            <iframe src={aula.url} className="w-full h-[70vh] rounded border" />
            <a href={aula.url} target="_blank" rel="noreferrer" className="text-sm underline">
              Abrir PDF em nova aba
            </a>
          </>
        )}
        {aula.tipo === "texto" && (
          <div className="prose max-w-none whitespace-pre-wrap text-sm">{aula.conteudo}</div>
        )}

        <div>
          <Button onClick={() => concluir.mutate()} disabled={aula.concluido}>
            {aula.concluido ? "Concluída" : "Marcar como concluída"}
          </Button>
        </div>

        <Entrega aulaId={aula.id} />
      </CardContent>
    </Card>
  );
}

function Entrega({ aulaId }: { aulaId: number }) {
  const { toast } = useToast();
  const [texto, setTexto] = useState("");
  const { data: minha } = useQuery<{ texto?: string } | null>({
    queryKey: ["ead-entrega", aulaId],
    queryFn: () => fetch(`/api/ead/entregas?aulaId=${aulaId}`).then((r) => (r.ok ? r.json() : null)),
  });

  const enviar = useMutation({
    mutationFn: () =>
      fetch("/api/ead/entregas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aulaId, texto }),
      }).then((r) => {
        if (!r.ok) throw new Error();
      }),
    onSuccess: () => {
      toast({ title: "Entrega enviada" });
      setTexto("");
    },
    onError: () => toast({ title: "Erro ao enviar entrega", variant: "destructive" }),
  });

  return (
    <div className="border-t pt-4 flex flex-col gap-2">
      <Label>Entrega de atividade</Label>
      {minha?.texto && <p className="text-sm text-muted-foreground">Última entrega: {minha.texto}</p>}
      <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Sua resposta…" />
      <Button size="sm" onClick={() => enviar.mutate()} disabled={!texto}>
        Enviar entrega
      </Button>
    </div>
  );
}

type Questionario = { id: number; titulo: string; notaMinima: number | null };
type Questao = { id: number; enunciado: string; tipo: string; opcoes: string[] | null; ordem: number };

function Quizzes({ moduloId }: { moduloId: number }) {
  const { data } = useQuery<Questionario[]>({
    queryKey: ["ead-questionarios", moduloId],
    queryFn: () => fetch(`/api/ead/questionarios?moduloId=${moduloId}`).then((r) => (r.ok ? r.json() : [])),
  });
  if (!data?.length) return null;
  return (
    <div className="flex flex-col gap-2 border-t pt-2">
      <p className="text-xs font-medium text-muted-foreground">Questionários</p>
      {data.map((q) => (
        <Quiz key={q.id} questionario={q} />
      ))}
    </div>
  );
}

function Quiz({ questionario }: { questionario: Questionario }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [nota, setNota] = useState<number | null>(null);

  const { data: questoes } = useQuery<Questao[]>({
    queryKey: ["ead-questoes", questionario.id],
    queryFn: () => fetch(`/api/ead/questoes?questionarioId=${questionario.id}`).then((r) => (r.ok ? r.json() : [])),
    enabled: open,
  });

  const enviar = useMutation({
    mutationFn: () =>
      fetch("/api/ead/tentativas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionarioId: questionario.id, respostas }),
      }).then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<{ nota: number }>;
      }),
    onSuccess: (d) => setNota(d.nota),
    onError: () => toast({ title: "Erro ao enviar", variant: "destructive" }),
  });

  return (
    <div className="text-sm">
      <button className="underline" onClick={() => setOpen((o) => !o)}>
        {questionario.titulo}
      </button>
      {open && (
        <div className="flex flex-col gap-3 mt-2 pl-2 border-l">
          {questoes?.map((q) => (
            <div key={q.id} className="flex flex-col gap-1">
              <p>{q.enunciado}</p>
              {q.opcoes?.length ? (
                q.opcoes.map((op, i) => (
                  <label key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={op}
                      checked={respostas[q.id] === op}
                      onChange={(e) => setRespostas((r) => ({ ...r, [q.id]: e.target.value }))}
                    />
                    {op}
                  </label>
                ))
              ) : (
                <Input
                  value={respostas[q.id] ?? ""}
                  onChange={(e) => setRespostas((r) => ({ ...r, [q.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
          {nota != null ? (
            <p className="font-medium">
              Nota: {nota}
              {questionario.notaMinima != null && (nota >= questionario.notaMinima ? " — Aprovado" : " — Reprovado")}
            </p>
          ) : (
            <Button size="sm" onClick={() => enviar.mutate()}>
              Enviar respostas
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

type Post = { id: number; mensagem: string; parentId: number | null; autorNome?: string };

function Forum({ cursoId }: { cursoId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mensagem, setMensagem] = useState("");

  const { data: foruns } = useQuery<{ id: number; titulo: string }[]>({
    queryKey: ["ead-foruns", cursoId],
    queryFn: () => fetch(`/api/ead/foruns?cursoId=${cursoId}`).then((r) => (r.ok ? r.json() : [])),
  });
  const forumId = foruns?.[0]?.id;

  const { data: posts } = useQuery<Post[]>({
    queryKey: ["ead-posts", forumId],
    queryFn: () => fetch(`/api/ead/posts?forumId=${forumId}`).then((r) => (r.ok ? r.json() : [])),
    enabled: !!forumId,
  });

  const enviar = useMutation({
    mutationFn: () =>
      fetch("/api/ead/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forumId, mensagem }),
      }).then((r) => {
        if (!r.ok) throw new Error();
      }),
    onSuccess: () => {
      setMensagem("");
      qc.invalidateQueries({ queryKey: ["ead-posts", forumId] });
    },
    onError: () => toast({ title: "Erro ao publicar", variant: "destructive" }),
  });

  if (!forumId) return <p className="text-muted-foreground">Nenhum fórum disponível.</p>;

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex flex-col gap-2">
        <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Escreva uma mensagem…" />
        <Button size="sm" onClick={() => enviar.mutate()} disabled={!mensagem}>
          Publicar
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {posts?.map((p) => (
          <li key={p.id} className="border rounded p-3">
            {p.autorNome && <p className="text-xs font-medium">{p.autorNome}</p>}
            <p className="text-sm whitespace-pre-wrap">{p.mensagem}</p>
          </li>
        ))}
        {!posts?.length && <li className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</li>}
      </ul>
    </div>
  );
}
