"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useListCursos, useListProfessores } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  cargaHoraria: z.coerce.number().min(1, "Carga horária inválida"),
  cursoId: z.coerce.number().min(1, "Selecione um curso"),
  professorId: z.coerce.number().optional(),
  periodo: z.coerce.number().optional(),
  obrigatoria: z.boolean().default(true),
});
type FormValues = z.infer<typeof formSchema>;

export default function DisciplinaForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: cursos } = useListCursos({});
  const { data: professores } = useListProfessores({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: "", descricao: "", obrigatoria: true },
  });

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      fetch("/api/disciplinas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      }).then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      }),
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Disciplina cadastrada com sucesso." });
      router.push("/disciplinas");
    },
    onError: () =>
      toast({ title: "Erro", description: "Ocorreu um erro ao cadastrar a disciplina.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/disciplinas"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova Disciplina</h1>
          <p className="text-muted-foreground">Cadastre uma disciplina na matriz curricular.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input placeholder="Ex: Cálculo I" {...field} /></FormControl>
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
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cargaHoraria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carga Horária *</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="periodo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 1" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cursoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Curso *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cursos?.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="professorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professor Padrão</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {professores?.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="obrigatoria"
                render={({ field }) => (
                  <FormItem className="col-span-2 flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Obrigatória</FormLabel>
                      <FormDescription>Disciplina obrigatória na matriz curricular.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild>
                <Link href="/disciplinas">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Salvando..." : "Salvar Disciplina"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
