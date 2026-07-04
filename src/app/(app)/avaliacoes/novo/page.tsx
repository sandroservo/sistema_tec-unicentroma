"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

type Turma = { id: number; nome: string };
type Disciplina = { id: number; nome: string };

const TIPOS = ["prova", "trabalho", "seminario", "atividade", "pratica", "recuperacao", "segunda_chamada"] as const;

const fetchJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro ao carregar");
  return res.json();
};

const formSchema = z.object({
  turmaId: z.string().min(1, "Selecione a turma"),
  disciplinaId: z.string().min(1, "Selecione a disciplina"),
  tipo: z.enum(TIPOS),
  descricao: z.string().optional(),
  peso: z.coerce.number().positive("Peso deve ser maior que zero"),
  data: z.string().optional(),
});

export default function NovaAvaliacao() {
  const router = useRouter();
  const { toast } = useToast();

  const { data: turmas } = useQuery<Turma[]>({ queryKey: ["turmas"], queryFn: () => fetchJson("/api/turmas") });
  const { data: disciplinas } = useQuery<Disciplina[]>({ queryKey: ["disciplinas"], queryFn: () => fetchJson("/api/disciplinas") });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { turmaId: "", disciplinaId: "", tipo: "prova", descricao: "", peso: 1, data: "" },
  });

  const create = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await fetch("/api/avaliacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turmaId: Number(values.turmaId),
          disciplinaId: Number(values.disciplinaId),
          tipo: values.tipo,
          descricao: values.descricao || undefined,
          peso: values.peso,
          data: values.data || undefined,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar");
      return res.json() as Promise<{ id: number }>;
    },
    onSuccess: (a) => {
      toast({ title: "Sucesso", description: "Avaliação criada." });
      router.push(`/avaliacoes/${a.id}`);
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível criar a avaliação.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/avaliacoes"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova Avaliação</h1>
          <p className="text-muted-foreground">Cadastre uma avaliação para lançar notas.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="turmaId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Turma *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {turmas?.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="disciplinaId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Disciplina *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {disciplinas?.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="peso" render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso *</FormLabel>
                  <FormControl><Input type="number" step="0.1" min="0.1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Input placeholder="Ex: Prova bimestral" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild><Link href="/avaliacoes">Cancelar</Link></Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
