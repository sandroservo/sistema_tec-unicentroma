"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type PlanoConta = { id: number; nome: string };

const formSchema = z.object({
  descricao: z.string().min(1, "Informe a descrição"),
  valor: z.coerce.number().positive("Valor deve ser maior que zero"),
  vencimento: z.string().min(1, "Informe o vencimento"),
  fornecedor: z.string().optional(),
  planoContaId: z.string().optional(),
  observacoes: z.string().optional(),
});

export default function NovaContaPagar() {
  const router = useRouter();
  const { toast } = useToast();

  const { data: planos } = useQuery<PlanoConta[]>({
    queryKey: ["planos-conta", "despesa"],
    queryFn: () => fetch("/api/planos-conta?tipo=despesa").then((r) => r.json()),
  });

  const form = useForm<z.input<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { descricao: "", valor: undefined, vencimento: "", fornecedor: "", observacoes: "" },
  });

  const criar = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await fetch("/api/contas-pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: values.descricao,
          valor: values.valor,
          vencimento: values.vencimento,
          fornecedor: values.fornecedor || undefined,
          planoContaId: values.planoContaId ? Number(values.planoContaId) : undefined,
          observacoes: values.observacoes || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Conta cadastrada." });
      router.push("/contas-pagar");
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível cadastrar a conta.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/contas-pagar"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova Conta a Pagar</h1>
          <p className="text-muted-foreground">Cadastre uma despesa.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => criar.mutate(v as z.infer<typeof formSchema>))} className="space-y-6">
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl><Input placeholder="Ex: Conta de energia" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor *</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimento *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fornecedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <FormControl><Input placeholder="Ex: Copel" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="planoContaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria (plano de conta)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {planos?.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Textarea placeholder="Notas internas..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/contas-pagar">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={criar.isPending}>Salvar</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
