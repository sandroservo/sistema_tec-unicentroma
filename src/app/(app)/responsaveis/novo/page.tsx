"use client";

import { useRouter } from "next/navigation";
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
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  alunoIds: z.array(z.number()).min(1, "Selecione ao menos um aluno"),
});

type FormValues = z.infer<typeof formSchema>;
type Aluno = { id: number; nome: string };

export default function ResponsavelForm() {
  const router = useRouter();
  const { toast } = useToast();

  const { data: alunosData } = useQuery<{ data: Aluno[] }>({
    queryKey: ["alunos-select"],
    queryFn: () => fetch("/api/alunos?limit=100").then((r) => r.json()),
  });
  const alunos = alunosData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: "", email: "", cpf: "", telefone: "", parentesco: "responsavel", senha: "", alunoIds: [] },
  });

  async function onSubmit(values: FormValues) {
    const res = await fetch("/api/responsaveis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      toast({ title: "Sucesso", description: "Responsável cadastrado com sucesso." });
      router.push("/responsaveis");
    } else {
      const body = await res.json().catch(() => null);
      toast({
        title: "Erro",
        description: body?.error ?? "Ocorreu um erro ao cadastrar o responsável.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/responsaveis">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo responsável</h1>
          <p className="text-muted-foreground">Cadastre um responsável e vincule os alunos.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="parentesco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parentesco</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pai">Pai</SelectItem>
                        <SelectItem value="mae">Mãe</SelectItem>
                        <SelectItem value="responsavel">Responsável</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha de acesso</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="alunoIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alunos vinculados</FormLabel>
                  <div className="rounded-md border divide-y max-h-72 overflow-y-auto">
                    {alunos.length ? (
                      alunos.map((a) => {
                        const checked = field.value.includes(a.id);
                        return (
                          <label key={a.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) =>
                                field.onChange(v ? [...field.value, a.id] : field.value.filter((id) => id !== a.id))
                              }
                            />
                            <span className="text-sm">{a.nome}</span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum aluno disponível.</p>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href="/responsaveis">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
