"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const schema = z.object({
  identificador: z.string().min(1, "Informe CPF, e-mail ou matrícula"),
});

export default function EsqueciSenha() {
  const [enviado, setEnviado] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { identificador: "" },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setEnviado(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-lg p-6 shadow-sm flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Esqueci a senha</h1>
          <p className="text-muted-foreground">
            Informe seu CPF, e-mail ou matrícula para receber instruções de redefinição.
          </p>
        </div>

        {enviado ? (
          <p className="text-sm text-muted-foreground">
            Se existir uma conta com esse identificador, enviamos instruções para redefinir a senha.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="identificador"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF, e-mail ou matrícula</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Enviando..." : "Enviar instruções"}
              </Button>
            </form>
          </Form>
        )}

        <Link href="/login" className="text-sm text-muted-foreground hover:underline text-center">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
