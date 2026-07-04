"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function SalaForm() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: "", bloco: "", capacidade: 0, tipo: "sala", recursos: "", ativo: true },
  });

  const create = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await fetch("/api/salas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Erro ao criar sala");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salas"] });
      toast({ title: "Sucesso", description: "Sala cadastrada com sucesso." });
      router.push("/salas");
    },
    onError: () => toast({ title: "Erro", description: "Ocorreu um erro ao cadastrar a sala.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/salas"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova Sala</h1>
          <p className="text-muted-foreground">Cadastre uma nova sala no sistema.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input placeholder="Ex: Sala 101" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bloco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bloco</FormLabel>
                    <FormControl><Input placeholder="Ex: A" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade *</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sala">Sala</SelectItem>
                        <SelectItem value="laboratorio">Laboratório</SelectItem>
                        <SelectItem value="auditorio">Auditório</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recursos"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Recursos</FormLabel>
                    <FormControl><Input placeholder="Ex: projetor, ar-condicionado" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="col-span-2 flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Ativo</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild><Link href="/salas">Cancelar</Link></Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Salvando..." : "Salvar Sala"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
