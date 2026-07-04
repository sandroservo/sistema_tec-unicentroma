"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const TIPOS = [
  "feriado", "prova", "recesso", "evento",
  "conselho", "formatura", "inicio_semestre", "fim_semestre",
] as const;

const formSchema = z.object({
  titulo: z.string().min(1, "Informe o título"),
  tipo: z.enum(TIPOS),
  dataInicio: z.string().min(1, "Informe a data de início"),
  dataFim: z.string().optional(),
  descricao: z.string().optional(),
});

export default function EventoForm() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { titulo: "", tipo: "evento", dataInicio: "", dataFim: "", descricao: "" },
  });

  const create = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await fetch("/api/calendario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, dataFim: values.dataFim || null }),
      });
      if (!res.ok) throw new Error("Erro ao criar evento");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendario"] });
      toast({ title: "Sucesso", description: "Evento cadastrado com sucesso." });
      router.push("/calendario");
    },
    onError: () => toast({ title: "Erro", description: "Ocorreu um erro ao cadastrar o evento.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/calendario"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo Evento</h1>
          <p className="text-muted-foreground">Cadastre um novo evento no calendário.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Título *</FormLabel>
                    <FormControl><Input placeholder="Ex: Prova N1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPOS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataFim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Fim</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Descrição</FormLabel>
                    <FormControl><Textarea placeholder="Detalhes do evento" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild><Link href="/calendario">Cancelar</Link></Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Salvando..." : "Salvar Evento"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
