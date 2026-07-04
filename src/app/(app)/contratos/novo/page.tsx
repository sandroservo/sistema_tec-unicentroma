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

const formSchema = z.object({
  alunoId: z.string().min(1, "Selecione um aluno"),
  cursoId: z.string().optional(),
  turmaId: z.string().optional(),
  valorTotal: z.coerce.number().positive("Valor deve ser maior que zero"),
  numParcelas: z.coerce.number().int().positive("Informe o número de parcelas"),
  diaVencimento: z.coerce.number().int().min(1).max(31),
  dataInicio: z.string().min(1, "Informe a data de início"),
  bolsaId: z.string().optional(),
  convenioId: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormValues = z.input<typeof formSchema>;

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const useList = (key: string, url: string, map: (j: any) => any[]) =>
  useQuery<any[]>({ queryKey: [key], queryFn: () => fetch(url).then((r) => r.json()).then(map).catch(() => []) });

export default function ContratoForm() {
  const router = useRouter();
  const { toast } = useToast();

  const alunos = useList("alunos", "/api/alunos", (j) => j.data ?? []);
  const cursos = useList("cursos", "/api/cursos", (j) => j ?? []);
  const turmas = useList("turmas", "/api/turmas", (j) => j ?? []);
  const bolsas = useList("bolsas", "/api/bolsas", (j) => (Array.isArray(j) ? j : (j.data ?? [])));
  const convenios = useList("convenios", "/api/convenios", (j) => (Array.isArray(j) ? j : (j.data ?? [])));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { diaVencimento: 10, numParcelas: 12 },
  });

  const create = useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Erro");
        return r.json();
      }),
  });

  const w = form.watch();
  const desc =
    (bolsas.data?.find((b) => String(b.id) === w.bolsaId)?.percentual ?? 0) +
    (convenios.data?.find((c) => String(c.id) === w.convenioId)?.percentualDesconto ?? 0);
  const descClamp = Math.min(100, Number(desc) || 0);
  const valorTotal = Number(w.valorTotal) || 0;
  const numParcelas = Number(w.numParcelas) || 0;
  const parcelaEstimada = numParcelas > 0 ? (valorTotal * (1 - descClamp / 100)) / numParcelas : 0;

  function onSubmit(values: FormValues) {
    const payload = {
      alunoId: Number(values.alunoId),
      cursoId: values.cursoId ? Number(values.cursoId) : undefined,
      turmaId: values.turmaId ? Number(values.turmaId) : undefined,
      valorTotal: Number(values.valorTotal),
      numParcelas: Number(values.numParcelas),
      diaVencimento: Number(values.diaVencimento),
      dataInicio: values.dataInicio,
      bolsaId: values.bolsaId ? Number(values.bolsaId) : undefined,
      convenioId: values.convenioId ? Number(values.convenioId) : undefined,
      observacoes: values.observacoes || undefined,
    };
    create.mutate(payload, {
      onSuccess: (c) => {
        toast({ title: "Sucesso", description: "Contrato criado." });
        router.push(`/contratos/${c.id}`);
      },
      onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/contratos"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo contrato</h1>
          <p className="text-muted-foreground">Gere um contrato e suas parcelas.</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="alunoId" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Aluno *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {alunos.data?.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="cursoId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Curso</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {cursos.data?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="turmaId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Turma</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {turmas.data?.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="valorTotal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor total *</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="numParcelas" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº de parcelas *</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="diaVencimento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dia de vencimento *</FormLabel>
                  <FormControl><Input type="number" min={1} max={31} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="dataInicio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de início *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="bolsaId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bolsa</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {bolsas.data?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.tipo} - {b.percentual}%</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="convenioId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Convênio</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {convenios.data?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nome} - {c.percentualDesconto}%</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="rounded-md bg-muted p-4 text-sm">
              <div className="flex justify-between"><span>Desconto efetivo</span><span>{descClamp}%</span></div>
              <div className="flex justify-between font-medium">
                <span>Parcela estimada</span>
                <span>{brl(parcelaEstimada)} {numParcelas > 0 ? `× ${numParcelas}` : ""}</span>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" asChild><Link href="/contratos">Cancelar</Link></Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Salvando..." : "Criar contrato"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
