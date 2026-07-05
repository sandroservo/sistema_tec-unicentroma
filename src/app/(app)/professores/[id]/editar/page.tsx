"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetProfessor, getGetProfessorQueryKey, useUpdateProfessor } from "@/lib/api-client";
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
  especialidade: z.string().optional(),
  titulacao: z.enum(["graduado", "especialista", "mestre", "doutor"]).optional(),
  status: z.enum(["ativo", "inativo"]),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProfessorEditar() {
  const router = useRouter();
  const { toast } = useToast();
  const id = Number(useParams().id);

  const { data: professor, isLoading } = useGetProfessor(id, {
    query: { enabled: !!id, queryKey: getGetProfessorQueryKey(id) },
  });
  const updateProfessor = useUpdateProfessor();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      email: "",
      cpf: "",
      telefone: "",
      especialidade: "",
      titulacao: undefined,
      status: "ativo",
    },
  });

  useEffect(() => {
    if (professor) {
      form.reset({
        nome: professor.nome ?? "",
        email: professor.email ?? "",
        cpf: professor.cpf ?? "",
        telefone: professor.telefone ?? "",
        especialidade: professor.especialidade ?? "",
        titulacao: (professor.titulacao as FormValues["titulacao"]) ?? undefined,
        status: (professor.status as FormValues["status"]) ?? "ativo",
      });
    }
  }, [professor, form]);

  function onSubmit(values: FormValues) {
    updateProfessor.mutate(
      { id, data: values },
      {
        onSuccess: () => {
          toast({ title: "Sucesso", description: "Professor atualizado com sucesso." });
          router.push("/professores");
        },
        onError: () => toast({ title: "Erro", description: "Não foi possível atualizar o professor.", variant: "destructive" }),
      },
    );
  }

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/professores"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Editar Professor</h1>
          <p className="text-muted-foreground">Atualize os dados do professor.</p>
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
              <FormField control={form.control} name="especialidade" render={({ field }) => (
                <FormItem><FormLabel>Especialidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="titulacao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Titulação</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="graduado">Graduado</SelectItem>
                      <SelectItem value="especialista">Especialista</SelectItem>
                      <SelectItem value="mestre">Mestre</SelectItem>
                      <SelectItem value="doutor">Doutor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild><Link href="/professores">Cancelar</Link></Button>
              <Button type="submit" disabled={updateProfessor.isPending}>
                {updateProfessor.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
