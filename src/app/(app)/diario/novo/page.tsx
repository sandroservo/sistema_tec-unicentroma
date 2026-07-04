"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

type Turma = { id: number; nome: string };
type Disciplina = { id: number; nome: string };

const formSchema = z.object({
  turmaId: z.string().min(1, "Selecione a turma"),
  disciplinaId: z.string().min(1, "Selecione a disciplina"),
  data: z.string().min(1, "Informe a data"),
  conteudo: z.string().min(1, "Informe o conteúdo"),
  observacoes: z.string().optional(),
});

export default function AulaForm() {
  const router = useRouter();
  const { toast } = useToast();

  const { data: turmas } = useQuery<Turma[]>({
    queryKey: ["turmas"],
    queryFn: () => fetch("/api/turmas").then((r) => r.json()),
  });
  const { data: disciplinas } = useQuery<Disciplina[]>({
    queryKey: ["disciplinas"],
    queryFn: () => fetch("/api/disciplinas").then((r) => r.json()),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { turmaId: "", disciplinaId: "", data: "", conteudo: "", observacoes: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const res = await fetch("/api/aulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      const aula = await res.json();
      toast({ title: "Sucesso", description: "Aula registrada. Faça a chamada." });
      router.push(`/diario/${aula.id}`);
    } catch {
      toast({ title: "Erro", description: "Não foi possível registrar a aula.", variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/diario"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Registrar aula</h1>
          <p className="text-muted-foreground">Registre uma aula no diário eletrônico.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="turmaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turma *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {turmas?.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="disciplinaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disciplina *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {disciplinas?.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="conteudo"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Conteúdo ministrado *</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild>
                <Link href="/diario">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Salvando..." : "Salvar e fazer chamada"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
