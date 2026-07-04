"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  ementa: z.string().optional(),
  conteudoProgramatico: z.string().optional(),
  competencias: z.string().optional(),
  metodologia: z.string().optional(),
  bibliografia: z.string().optional(),
  criterioAvaliacao: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const fields: { name: keyof FormValues; label: string }[] = [
  { name: "ementa", label: "Ementa" },
  { name: "conteudoProgramatico", label: "Conteúdo Programático" },
  { name: "competencias", label: "Competências" },
  { name: "metodologia", label: "Metodologia" },
  { name: "bibliografia", label: "Bibliografia" },
  { name: "criterioAvaliacao", label: "Critério de Avaliação" },
];

export default function PlanoEnsinoForm() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const disciplina = useQuery({
    queryKey: ["disciplina", id],
    queryFn: () => fetch(`/api/disciplinas/${id}`).then((r) => r.json()),
  });

  const plano = useQuery({
    queryKey: ["plano", id],
    queryFn: () => fetch(`/api/disciplinas/${id}/plano`).then((r) => r.json()),
  });

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: {} });

  useEffect(() => {
    if (plano.data) {
      form.reset({
        ementa: plano.data.ementa ?? "",
        conteudoProgramatico: plano.data.conteudoProgramatico ?? "",
        competencias: plano.data.competencias ?? "",
        metodologia: plano.data.metodologia ?? "",
        bibliografia: plano.data.bibliografia ?? "",
        criterioAvaliacao: plano.data.criterioAvaliacao ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano.data]);

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      fetch(`/api/disciplinas/${id}/plano`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      }).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
    onSuccess: () => toast({ title: "Sucesso", description: "Plano de ensino salvo." }),
    onError: () =>
      toast({ title: "Erro", description: "Ocorreu um erro ao salvar o plano.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/disciplinas"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plano de Ensino</h1>
          <p className="text-muted-foreground">{disciplina.data?.nome ?? "Carregando..."}</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-6">
            {fields.map(({ name, label }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild>
                <Link href="/disciplinas">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar Plano"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
