"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Aula = {
  id: number;
  titulo: string;
  tipo: string;
  url: string | null;
  conteudo: string | null;
  ordem: number;
  duracaoMin: number | null;
};
type Modulo = { id: number; titulo: string; descricao: string | null; ordem: number; totalAulas: number };

const TIPOS = ["video", "pdf", "texto", "link"] as const;

export default function EadBuilderPage() {
  const cursoId = Number(useParams().cursoId);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: modulos, isLoading } = useQuery<Modulo[]>({
    queryKey: ["ead-modulos", cursoId],
    queryFn: () => fetch(`/api/ead/modulos?cursoId=${cursoId}`).then((r) => r.json()),
  });

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["ead-modulos", cursoId] });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conteúdo do curso</h1>
          <p className="text-muted-foreground">Módulos e aulas.</p>
        </div>
        <ModuloDialog cursoId={cursoId} onSaved={refetch} />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : !modulos?.length ? (
        <p className="text-muted-foreground">Nenhum módulo. Crie o primeiro.</p>
      ) : (
        <Accordion type="multiple" className="flex flex-col gap-2">
          {modulos.map((m) => (
            <AccordionItem key={m.id} value={String(m.id)} className="border rounded-lg px-4 bg-card">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  {m.titulo}
                  <Badge variant="secondary">{m.totalAulas} aulas</Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ModuloAulas modulo={m} cursoId={cursoId} onChanged={refetch} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );

  function ModuloAulas({ modulo, onChanged }: { modulo: Modulo; cursoId: number; onChanged: () => void }) {
    const { data: aulas } = useQuery<Aula[]>({
      queryKey: ["ead-aulas", modulo.id],
      queryFn: () => fetch(`/api/ead/aulas?moduloId=${modulo.id}`).then((r) => r.json()),
    });
    const refetchAulas = () => qc.invalidateQueries({ queryKey: ["ead-aulas", modulo.id] });

    const delModulo = useMutation({
      mutationFn: () => fetch(`/api/ead/modulos/${modulo.id}`, { method: "DELETE" }),
      onSuccess: () => {
        toast({ title: "Módulo excluído" });
        onChanged();
      },
    });
    const delAula = useMutation({
      mutationFn: (id: number) => fetch(`/api/ead/aulas/${id}`, { method: "DELETE" }),
      onSuccess: () => {
        toast({ title: "Aula excluída" });
        refetchAulas();
        onChanged();
      },
    });

    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <ModuloDialog cursoId={cursoId} modulo={modulo} onSaved={onChanged} />
          <Button variant="ghost" size="sm" onClick={() => delModulo.mutate()}>
            <Trash2 className="w-4 h-4 mr-1" /> Excluir módulo
          </Button>
        </div>

        <ul className="flex flex-col gap-1">
          {aulas?.map((a) => (
            <li key={a.id} className="flex items-center justify-between border rounded px-3 py-2">
              <span className="flex items-center gap-2">
                <Badge variant="outline">{a.tipo}</Badge>
                {a.titulo}
              </span>
              <span className="flex gap-1">
                <AulaDialog moduloId={modulo.id} aula={a} onSaved={() => { refetchAulas(); onChanged(); }} />
                <Button variant="ghost" size="icon" onClick={() => delAula.mutate(a.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </span>
            </li>
          ))}
          {!aulas?.length && <li className="text-sm text-muted-foreground">Nenhuma aula.</li>}
        </ul>

        <AulaDialog moduloId={modulo.id} onSaved={() => { refetchAulas(); onChanged(); }} />
      </div>
    );
  }
}

function ModuloDialog({ cursoId, modulo, onSaved }: { cursoId: number; modulo?: Modulo; onSaved: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(modulo?.titulo ?? "");
  const [descricao, setDescricao] = useState(modulo?.descricao ?? "");
  const [ordem, setOrdem] = useState(String(modulo?.ordem ?? 0));

  const save = useMutation({
    mutationFn: () =>
      fetch(modulo ? `/api/ead/modulos/${modulo.id}` : "/api/ead/modulos", {
        method: modulo ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          modulo
            ? { titulo, descricao: descricao || null, ordem: Number(ordem) }
            : { cursoId, titulo, descricao: descricao || undefined, ordem: Number(ordem) },
        ),
      }).then((r) => {
        if (!r.ok) throw new Error();
      }),
    onSuccess: () => {
      toast({ title: modulo ? "Módulo atualizado" : "Módulo criado" });
      setOpen(false);
      onSaved();
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {modulo ? (
          <Button variant="ghost" size="sm">
            <Pencil className="w-4 h-4 mr-1" /> Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" /> Novo módulo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modulo ? "Editar módulo" : "Novo módulo"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div>
            <Label>Ordem</Label>
            <Input type="number" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={!titulo}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AulaDialog({ moduloId, aula, onSaved }: { moduloId: number; aula?: Aula; onSaved: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(aula?.titulo ?? "");
  const [tipo, setTipo] = useState(aula?.tipo ?? "video");
  const [url, setUrl] = useState(aula?.url ?? "");
  const [conteudo, setConteudo] = useState(aula?.conteudo ?? "");
  const [ordem, setOrdem] = useState(String(aula?.ordem ?? 0));
  const [duracao, setDuracao] = useState(aula?.duracaoMin != null ? String(aula.duracaoMin) : "");

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        titulo,
        tipo,
        url: tipo === "texto" ? null : url || null,
        conteudo: tipo === "texto" ? conteudo || null : null,
        ordem: Number(ordem),
        duracaoMin: duracao ? Number(duracao) : null,
      };
      return fetch(aula ? `/api/ead/aulas/${aula.id}` : "/api/ead/aulas", {
        method: aula ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aula ? payload : { moduloId, ...payload }),
      }).then((r) => {
        if (!r.ok) throw new Error();
      });
    },
    onSuccess: () => {
      toast({ title: aula ? "Aula atualizada" : "Aula criada" });
      setOpen(false);
      onSaved();
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {aula ? (
          <Button variant="ghost" size="icon">
            <Pencil className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nova aula
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{aula ? "Editar aula" : "Nova aula"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {tipo === "texto" ? (
            <div>
              <Label>Conteúdo</Label>
              <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={6} />
            </div>
          ) : (
            <div>
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Ordem</Label>
              <Input type="number" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label>Duração (min)</Label>
              <Input type="number" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={!titulo}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
