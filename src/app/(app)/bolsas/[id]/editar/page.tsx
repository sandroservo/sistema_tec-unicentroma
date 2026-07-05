"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
  ativo: z.boolean(),
});
type FormValues = z.infer<typeof formSchema>;

export default function BolsaEditar() {
  const router = useRouter();
  const { toast } = useToast();
  const id = Number(useParams().id);

  const { data: alunos } = useQuery<{ data: { id: number; nome: string }[] }>({
    queryKey: ["alunos", "select"],
    queryFn: () => fetch("/api/alunos?limit=100").then((r) => r.json()),
  });
  const { data: bolsa, isLoading } = useQuery<any>({
    queryKey: ["bolsa", id],
    queryFn: () => fetch(`/api/bolsas/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { alunoId: 0, tipo: "parcial", percentual: 0, motivo: "", dataInicio: "", dataFim: "", ativo: true },
  });
  const isIntegral = form.watch("tipo") === "integral";

  useEffect(() => {
    if (bolsa && !bolsa.error) {
      form.reset({
        alunoId: Number(bolsa.alunoId ?? 0),
        tipo: (bolsa.tipo as FormValues["tipo"]) ?? "parcial",
        percentual: Number(bolsa.percentual ?? 0),
        motivo: bolsa.motivo ?? "",
        dataInicio: bolsa.dataInicio ?? "",
        dataFim: bolsa.dataFim ?? "",
        ativo: !!bolsa.ativo,
      });
    }
  }, [bolsa, form]);

  const update = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, percentual: values.tipo === "integral" ? 100 : values.percentual };
      const res = await fetch(`/api/bolsas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Bolsa atualizada." });
      router.push(`/bolsas/${id}`);
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" }),
  });

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/bolsas/${id}`}><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div><h1 className="text-2xl font-semibold tracking-tight">Editar Bolsa</h1></div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => update.mutate(v))} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="alunoId" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Aluno *</FormLabel>
                  <Select value={field.value ? String(field.value) : ""} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{alunos?.data?.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="integral">Integral</SelectItem>
                      <SelectItem value="parcial">Parcial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="percentual" render={({ field }) => (
                <FormItem>
                  <FormLabel>Percentual (%)</FormLabel>
                  <FormControl><Input type="number" min={0} max={100} disabled={isIntegral} {...field} value={isIntegral ? 100 : field.value} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dataInicio" render={({ field }) => (
                <FormItem><FormLabel>Data de Início *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dataFim" render={({ field }) => (
                <FormItem><FormLabel>Data de Fim</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="motivo" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Motivo</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ativo" render={({ field }) => (
                <FormItem className="col-span-2 flex items-center justify-between rounded-lg border p-4">
                  <FormLabel>Ativo</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild><Link href={`/bolsas/${id}`}>Cancelar</Link></Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? "Salvando..." : "Salvar alterações"}</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
