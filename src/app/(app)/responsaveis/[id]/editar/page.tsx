"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  parentesco: z.enum(["pai", "mae", "responsavel"]),
  alunoIds: z.array(z.number()).min(1, "Selecione ao menos um aluno"),
});

type FormValues = z.infer<typeof formSchema>;
type Aluno = { id: number; nome: string };
type Responsavel = {
  nome: string; email: string; cpf: string | null; telefone: string | null;
  parentesco: string; alunos: { id: number }[];
};

export default function ResponsavelEditar() {
  const router = useRouter();
  const { toast } = useToast();
  const id = Number(useParams().id);

  const { data: alunosData } = useQuery<{ data: Aluno[] }>({
    queryKey: ["alunos-select"],
    queryFn: () => fetch("/api/alunos?limit=100").then((r) => r.json()),
  });
  const alunos = alunosData?.data ?? [];

  const { data: resp, isLoading } = useQuery<Responsavel>({
    queryKey: ["responsavel", id],
    queryFn: () => fetch(`/api/responsaveis/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: "", email: "", cpf: "", telefone: "", parentesco: "responsavel", alunoIds: [] },
  });

  useEffect(() => {
    if (resp && !("error" in resp)) {
      form.reset({
        nome: resp.nome ?? "",
        email: resp.email ?? "",
        cpf: resp.cpf ?? "",
        telefone: resp.telefone ?? "",
        parentesco: (resp.parentesco as FormValues["parentesco"]) ?? "responsavel",
        alunoIds: resp.alunos?.map((a) => a.id) ?? [],
      });
    }
  }, [resp, form]);

  async function onSubmit(values: FormValues) {
    const res = await fetch(`/api/responsaveis/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      toast({ title: "Sucesso", description: "Responsável atualizado." });
      router.push(`/responsaveis/${id}`);
    } else {
      const body = await res.json().catch(() => null);
      toast({ title: "Erro", description: body?.error ?? "Não foi possível atualizar.", variant: "destructive" });
    }
  }

  if (isLoading) return <div className="p-8">Carregando…</div>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/responsaveis/${id}`}><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Editar responsável</h1>
          <p className="text-muted-foreground">Atualize os dados e os alunos vinculados.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField control={form.control} name="cpf" render={({ field }) => (
                <FormItem><FormLabel>CPF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="telefone" render={({ field }) => (
                <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="parentesco" render={({ field }) => (
              <FormItem>
                <FormLabel>Parentesco</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="pai">Pai</SelectItem>
                    <SelectItem value="mae">Mãe</SelectItem>
                    <SelectItem value="responsavel">Responsável</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="alunoIds" render={({ field }) => (
              <FormItem>
                <FormLabel>Alunos vinculados</FormLabel>
                <div className="rounded-md border divide-y max-h-72 overflow-y-auto">
                  {alunos.length ? alunos.map((a) => {
                    const checked = field.value.includes(a.id);
                    return (
                      <label key={a.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => field.onChange(v ? [...field.value, a.id] : field.value.filter((x) => x !== a.id))}
                        />
                        <span className="text-sm">{a.nome}</span>
                      </label>
                    );
                  }) : <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum aluno disponível.</p>}
                </div>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href={`/responsaveis/${id}`}>Cancelar</Link>
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>Salvar alterações</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
