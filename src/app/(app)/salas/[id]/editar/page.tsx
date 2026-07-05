"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  nome: z.string().min(1, "Informe o nome da sala"),
  bloco: z.string().optional(),
  capacidade: z.coerce.number().int().min(0, "Capacidade inválida"),
  tipo: z.enum(["sala", "laboratorio", "auditorio"]),
  recursos: z.string().optional(),
  ativo: z.boolean(),
});
type FormValues = z.infer<typeof formSchema>;

export default function SalaEditar() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const id = Number(useParams().id);

  const { data: sala, isLoading } = useQuery<any>({
    queryKey: ["sala", id],
    queryFn: () => fetch(`/api/salas/${id}`).then((res) => res.json()),
    enabled: !!id,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: "", bloco: "", capacidade: 0, tipo: "sala", recursos: "", ativo: true },
  });

  useEffect(() => {
    if (sala) {
      form.reset({
        nome: sala.nome ?? "",
        bloco: sala.bloco ?? "",
        capacidade: sala.capacidade ?? 0,
        tipo: (sala.tipo as FormValues["tipo"]) ?? "sala",
        recursos: sala.recursos ?? "",
        ativo: sala.ativo ?? true,
      });
    }
  }, [sala, form]);

  const update = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch(`/api/salas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Erro ao atualizar sala");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salas"] });
      qc.invalidateQueries({ queryKey: ["sala", id] });
      toast({ title: "Sucesso", description: "Sala atualizada com sucesso." });
      router.push("/salas");
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar a sala.", variant: "destructive" }),
  });

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/salas"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Editar Sala</h1>
          <p className="text-muted-foreground">Atualize os dados da sala.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => update.mutate(v))} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Nome *</FormLabel><FormControl><Input placeholder="Ex: Sala 101" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="bloco" render={({ field }) => (
                <FormItem><FormLabel>Bloco</FormLabel><FormControl><Input placeholder="Ex: A" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="capacidade" render={({ field }) => (
                <FormItem><FormLabel>Capacidade *</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="sala">Sala</SelectItem>
                      <SelectItem value="laboratorio">Laboratório</SelectItem>
                      <SelectItem value="auditorio">Auditório</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="recursos" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Recursos</FormLabel><FormControl><Input placeholder="Ex: projetor, ar-condicionado" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ativo" render={({ field }) => (
                <FormItem className="col-span-2 flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Ativo</FormLabel>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild><Link href="/salas">Cancelar</Link></Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
