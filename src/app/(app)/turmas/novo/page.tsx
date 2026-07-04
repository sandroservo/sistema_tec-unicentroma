"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateTurma, useListCursos, useListProfessores } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cursoId: z.coerce.number().min(1, "Selecione um curso"),
  professorId: z.coerce.number().optional(),
  dataInicio: z.string().min(10, "Data de início obrigatória"),
  dataFim: z.string().optional(),
  horario: z.string().optional(),
  vagas: z.coerce.number().min(1, "Vagas inválidas"),
  status: z.enum(["em_andamento", "encerrada", "planejada"]).default("planejada"),
});

export default function TurmaForm() {
  const router = useRouter();
  const { toast } = useToast();
  const createTurma = useCreateTurma();

  const { data: cursos } = useListCursos({ status: "ativo" });
  const { data: professores } = useListProfessores({ status: "ativo" });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      cursoId: 0,
      professorId: 0,
      dataInicio: "",
      dataFim: "",
      horario: "",
      vagas: 30,
      status: "planejada",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createTurma.mutate({ data: {
      nome: values.nome,
      cursoId: values.cursoId,
      professorId: values.professorId ? values.professorId : undefined,
      dataInicio: values.dataInicio,
      dataFim: values.dataFim,
      horario: values.horario,
      vagas: values.vagas,
      status: values.status
    } }, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Turma criada com sucesso." });
        router.push("/turmas");
      },
      onError: () => {
        toast({ title: "Erro", description: "Ocorreu um erro ao criar.", variant: "destructive" });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/turmas"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova Turma</h1>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome da Turma *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
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
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione um curso" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cursos?.map(c => (
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
                    <FormLabel>Professor Responsável</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione um professor" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {professores?.map(p => (
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
                    <FormLabel>Data de Término</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="horario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário</FormLabel>
                    <FormControl><Input placeholder="Ex: Seg/Qua 19h às 22h" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vagas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade de Vagas *</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Status da Turma</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planejada">Planejada</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="encerrada">Encerrada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild>
                <Link href="/turmas">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={createTurma.isPending}>
                {createTurma.isPending ? "Salvando..." : "Salvar Turma"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
