"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const schema = z
  .object({
    senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmar: z.string(),
  })
  .refine((d) => d.senha === d.confirmar, {
    message: "As senhas não coincidem",
    path: ["confirmar"],
  });

function RedefinirForm() {
  const router = useRouter();
  const { toast } = useToast();
  const token = useSearchParams().get("token") ?? "";

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { senha: "", confirmar: "" },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    const res = await fetch("/api/auth/reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, senha: values.senha }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({ title: "Erro", description: err.error ?? "Não foi possível redefinir a senha.", variant: "destructive" });
      return;
    }
    toast({ title: "Sucesso", description: "Senha redefinida. Faça login." });
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-lg p-6 shadow-sm flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Redefinir senha</h1>
          <p className="text-muted-foreground">Escolha uma nova senha para sua conta.</p>
        </div>

        {!token ? (
          <p className="text-sm text-muted-foreground">
            Link inválido. Solicite novamente em{" "}
            <Link href="/esqueci-senha" className="underline">esqueci a senha</Link>.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar senha</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Salvando..." : "Redefinir senha"}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}

export default function RedefinirSenha() {
  return (
    <Suspense>
      <RedefinirForm />
    </Suspense>
  );
}
