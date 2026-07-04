"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetCurso, getGetCursoQueryKey, useUpdateCurso } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  cargaHoraria: z.coerce.number().min(1, "Carga horária inválida"),
  modalidade: z.enum(["presencial", "online", "hibrido"]),
  valor: z.coerce.number().min(0, "Valor inválido"),
  status: z.enum(["ativo", "inativo", "rascunho"]),
  area: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CursoEditar() {
  const router = useRouter();
  const { toast } = useToast();
  const id = Number(useParams().id);

  const { data: curso, isLoading } = useGetCurso(id, {
    query: { enabled: !!id, queryKey: getGetCursoQueryKey(id) },
  });
  const updateCurso = useUpdateCurso();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      cargaHoraria: 0,
      valor: 0,
      modalidade: "presencial",
      status: "ativo",
      area: "",
    },
  });

  useEffect(() => {
    if (curso) {
      form.reset({
        nome: curso.nome ?? "",
        descricao: curso.descricao ?? "",
        cargaHoraria: Number(curso.cargaHoraria ?? 0),
        valor: Number(curso.valor ?? 0),
        modalidade: (curso.modalidade as FormValues["modalidade"]) ?? "presencial",
        status: (curso.status as FormValues["status"]) ?? "ativo",
        area: curso.area ?? "",
      });
    }
  }, [curso, form]);

  function onSubmit(values: FormValues) {
    updateCurso.mutate(
      { id, data: values },
      {
        onSuccess: () => {
          toast({ title: "Sucesso", description: "Curso atualizado com sucesso." });
          router.push("/cursos");
        },
        onError: () => toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" }),
      },
    );
  }

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/cursos"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Editar Curso</h1>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem><FormLabel>Nome do Curso *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="descricao" render={({ field }) => (
              <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="cargaHoraria" render={({ field }) => (
                <FormItem><FormLabel>Carga Horária (horas) *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="valor" render={({ field }) => (
                <FormItem><FormLabel>Valor (R$) *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="modalidade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Modalidade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
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
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="area" render={({ field }) => (
                <FormItem><FormLabel>Área do Conhecimento</FormLabel><FormControl><Input placeholder="Ex: Tecnologia" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild><Link href="/cursos">Cancelar</Link></Button>
              <Button type="submit" disabled={updateCurso.isPending}>
                {updateCurso.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
