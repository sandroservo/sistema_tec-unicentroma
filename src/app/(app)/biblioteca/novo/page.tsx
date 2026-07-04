"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateTitulo } from "../_hooks";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  titulo: z.string().min(2, "Informe o título"),
  autor: z.string().optional(),
  isbn: z.string().optional(),
  editora: z.string().optional(),
  ano: z.coerce.number().int().optional(),
  categoria: z.string().optional(),
});

export default function NovoTituloForm() {
  const router = useRouter();
  const { toast } = useToast();
  const createTitulo = useCreateTitulo();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { titulo: "", autor: "", isbn: "", editora: "", categoria: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createTitulo.mutate(values, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Título cadastrado." });
        router.push("/biblioteca");
      },
      onError: (e) => toast({ title: "Erro", description: (e as Error).message, variant: "destructive" }),
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/biblioteca"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo Título</h1>
          <p className="text-muted-foreground">Cadastre uma obra no acervo.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="titulo" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Título *</FormLabel>
                  <FormControl><Input placeholder="Ex: Dom Casmurro" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="autor" render={({ field }) => (
                <FormItem><FormLabel>Autor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="categoria" render={({ field }) => (
                <FormItem><FormLabel>Categoria</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="isbn" render={({ field }) => (
                <FormItem><FormLabel>ISBN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="editora" render={({ field }) => (
                <FormItem><FormLabel>Editora</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ano" render={({ field }) => (
                <FormItem><FormLabel>Ano</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild><Link href="/biblioteca">Cancelar</Link></Button>
              <Button type="submit" disabled={createTitulo.isPending}>
                {createTitulo.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
