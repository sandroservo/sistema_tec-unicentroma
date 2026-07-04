"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  vagas: z.coerce.number().int().min(0, "Vagas inválidas"),
  inscricaoInicio: z.string().min(1, "Obrigatório"),
  inscricaoFim: z.string().min(1, "Obrigatório"),
  dataProva: z.string().optional(),
  taxaInscricao: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NovoProcesso() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: "", descricao: "", vagas: 0, inscricaoInicio: "", inscricaoFim: "", dataProva: "", taxaInscricao: 0 },
  });

  const create = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch("/api/selecao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Processo criado com sucesso." });
      router.push("/selecao");
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível criar o processo.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/selecao"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo processo</h1>
          <p className="text-muted-foreground">Cadastre um novo processo seletivo.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Nome *</FormLabel>
                  <FormControl><Input placeholder="Ex: Vestibular 2026/1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="vagas" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vagas *</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="taxaInscricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxa de inscrição (R$)</FormLabel>
                  <FormControl><Input type="number" step="0.01" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="inscricaoInicio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Início das inscrições *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="inscricaoFim" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fim das inscrições *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dataProva" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da prova</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild><Link href="/selecao">Cancelar</Link></Button>
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
