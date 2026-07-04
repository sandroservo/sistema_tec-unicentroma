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
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const formSchema = z.object({
  alunoId: z.coerce.number().int().positive("Selecione um aluno"),
  tipo: z.enum(["integral", "parcial"]),
  percentual: z.coerce.number().min(0).max(100),
  motivo: z.string().optional(),
  dataInicio: z.string().min(1, "Informe a data de início"),
  dataFim: z.string().optional(),
  ativo: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

function useAlunos() {
  return useQuery<{ data: { id: number; nome: string }[] }>({
    queryKey: ["alunos", "select"],
    queryFn: async () => {
      const res = await fetch("/api/alunos?limit=100");
      if (!res.ok) throw new Error("Erro ao buscar alunos");
      return res.json();
    },
  });
}

export default function BolsaForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: alunos } = useAlunos();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { tipo: "parcial", percentual: 0, ativo: true, dataInicio: "" },
  });

  const tipo = form.watch("tipo");
  const isIntegral = tipo === "integral";

  const create = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch("/api/bolsas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Erro ao criar bolsa");
      return res.json();
    },
  });

  function onSubmit(values: FormValues) {
    const payload = { ...values, percentual: isIntegral ? 100 : values.percentual };
    create.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Bolsa cadastrada com sucesso." });
        router.push("/bolsas");
      },
      onError: () => {
        toast({ title: "Erro", description: "Ocorreu um erro ao cadastrar a bolsa.", variant: "destructive" });
      },
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/bolsas"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova Bolsa</h1>
          <p className="text-muted-foreground">Conceda uma bolsa de estudo a um aluno.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="alunoId"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Aluno *</FormLabel>
                    <Select value={field.value ? String(field.value) : ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um aluno" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {alunos?.data?.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="integral">Integral</SelectItem>
                        <SelectItem value="parcial">Parcial</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="percentual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        disabled={isIntegral}
                        {...field}
                        value={isIntegral ? 100 : field.value}
                      />
                    </FormControl>
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
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Motivo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Mérito acadêmico" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="col-span-2 flex items-center justify-between rounded-lg border p-4">
                    <FormLabel>Ativo</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild>
                <Link href="/bolsas">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Salvando..." : "Salvar Bolsa"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
