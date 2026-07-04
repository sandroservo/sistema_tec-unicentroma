"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetAluno, getGetAlunoQueryKey, useUpdateAluno } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z.string().min(11, "CPF inválido"),
  telefone: z.string().optional(),
  dataNascimento: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  status: z.enum(["ativo", "inativo", "formado", "trancado"]),
});

type FormValues = z.infer<typeof formSchema>;

export default function AlunoEditar() {
  const router = useRouter();
  const { toast } = useToast();
  const id = Number(useParams().id);

  const { data: aluno, isLoading } = useGetAluno(id, {
    query: { enabled: !!id, queryKey: getGetAlunoQueryKey(id) },
  });
  const updateAluno = useUpdateAluno();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      email: "",
      cpf: "",
      telefone: "",
      dataNascimento: "",
      endereco: "",
      cidade: "",
      estado: "",
      status: "ativo",
    },
  });

  // Preenche o form quando o aluno carrega.
  useEffect(() => {
    if (aluno) {
      form.reset({
        nome: aluno.nome ?? "",
        email: aluno.email ?? "",
        cpf: aluno.cpf ?? "",
        telefone: aluno.telefone ?? "",
        dataNascimento: aluno.dataNascimento ?? "",
        endereco: aluno.endereco ?? "",
        cidade: aluno.cidade ?? "",
        estado: aluno.estado ?? "",
        status: (aluno.status as FormValues["status"]) ?? "ativo",
      });
    }
  }, [aluno, form]);

  function onSubmit(values: FormValues) {
    updateAluno.mutate(
      { id, data: values },
      {
        onSuccess: () => {
          toast({ title: "Sucesso", description: "Aluno atualizado com sucesso." });
          router.push("/alunos");
        },
        onError: () => toast({ title: "Erro", description: "Não foi possível atualizar o aluno.", variant: "destructive" }),
      },
    );
  }

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/alunos"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Editar Aluno</h1>
          <p className="text-muted-foreground">Atualize os dados do aluno.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Nome Completo *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cpf" render={({ field }) => (
                <FormItem><FormLabel>CPF *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="telefone" render={({ field }) => (
                <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dataNascimento" render={({ field }) => (
                <FormItem><FormLabel>Data de Nascimento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="formado">Formado</SelectItem>
                      <SelectItem value="trancado">Trancado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="col-span-2 mt-4"><h3 className="text-lg font-medium">Endereço</h3></div>
              <FormField control={form.control} name="endereco" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Logradouro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cidade" render={({ field }) => (
                <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="estado" render={({ field }) => (
                <FormItem><FormLabel>Estado</FormLabel><FormControl><Input maxLength={2} placeholder="UF" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild><Link href="/alunos">Cancelar</Link></Button>
              <Button type="submit" disabled={updateAluno.isPending}>
                {updateAluno.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
