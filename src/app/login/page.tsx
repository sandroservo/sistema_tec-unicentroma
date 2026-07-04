"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

const schema = z.object({
  identificador: z.string().min(1, "Informe CPF, e-mail ou matrícula"),
  senha: z.string().min(1, "Informe a senha"),
  codigo: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.75 10.19c0-.72-.06-1.24-.19-1.79H10.18v3.25h4.92c-.1.81-.63 2.02-1.83 2.84l-.02.11 2.65 2.02.18.02c1.69-1.53 2.66-3.77 2.66-6.44Z" fill="#4285F4" />
      <path d="M10.18 18.75c2.41 0 4.43-.78 5.91-2.12l-2.82-2.14c-.75.51-1.76.87-3.09.87-2.36 0-4.36-1.53-5.08-3.64l-.1.01-2.76 2.09-.04.1a8.97 8.97 0 0 0 7.98 4.83Z" fill="#34A853" />
      <path d="M5.1 11.73c-.19-.55-.3-1.13-.3-1.73 0-.6.11-1.19.29-1.73l-.005-.116L2.29 6.03l-.09.04A8.97 8.97 0 0 0 1.25 10c0 1.41.35 2.74.95 3.93L5.1 11.73Z" fill="#FBBC05" />
      <path d="M10.18 4.63c1.68 0 2.81.71 3.45 1.3l2.52-2.4C14.6 2.12 12.59 1.25 10.18 1.25a8.97 8.97 0 0 0-7.98 4.82L5.09 8.27c.72-2.11 2.72-3.64 5.09-3.64Z" fill="#EB4335" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((p) => setHasGoogle(!!p?.google))
      .catch(() => {});
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identificador: "", senha: "", codigo: "" },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      if (!mfaStep) {
        const check = await fetch("/api/auth/mfa-check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ identificador: values.identificador, senha: values.senha }),
        }).then((r) => r.json());

        if (!check.ok) {
          toast({ title: "Falha no login", description: check.error ?? "Credenciais incorretas.", variant: "destructive" });
          return;
        }
        if (check.mfaRequired) {
          setMfaStep(true);
          toast({ title: "Verificação em duas etapas", description: "Informe o código do seu app autenticador." });
          return;
        }
      }

      const res = await signIn("credentials", { ...values, redirect: false });
      if (res?.error) {
        toast({
          title: "Falha no login",
          description: mfaStep ? "Código inválido." : "Credenciais incorretas.",
          variant: "destructive",
        });
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen bg-background lg:grid-cols-2">
      {/* Coluna do formulário */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6">
            <h1 className="mb-1.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Entrar</h1>
            <p className="text-sm text-muted-foreground">Acesse com CPF, e-mail ou matrícula e sua senha.</p>
          </div>

          {hasGoogle && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-3 bg-muted/60 font-normal hover:bg-muted"
                onClick={() => signIn("google", { callbackUrl: "/" })}
              >
                <GoogleIcon /> Entrar com Google
              </Button>
              <div className="relative py-5">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background px-4 text-muted-foreground">ou</span>
                </div>
              </div>
            </>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="identificador"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      CPF, e-mail ou matrícula <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input className="h-11" type="text" placeholder="voce@escola.com" autoComplete="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Senha <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          className="h-11 pr-11"
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite sua senha"
                          autoComplete="current-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mfaStep && (
                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de verificação</FormLabel>
                      <FormControl>
                        <Input className="h-11" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" autoFocus {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
                  <Checkbox defaultChecked /> Manter conectado
                </label>
                <Link href="/esqueci-senha" className="text-sm font-medium text-primary hover:underline">
                  Esqueci a senha
                </Link>
              </div>

              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? "Entrando..." : mfaStep ? "Verificar" : "Entrar"}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            É candidato?{" "}
            <Link href="/inscricao" className="font-medium text-primary hover:underline">
              Inscreva-se no processo seletivo
            </Link>
          </p>
        </div>
      </div>

      {/* Painel de marca — verde escuro da logo, grid sutil e glows (estilo TailAdmin) */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-[hsl(101_46%_12%)] lg:flex">
        {/* grade sutil com fade radial no centro */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(hsla(0,0%,100%,0.05) 1px,transparent 1px),linear-gradient(90deg,hsla(0,0%,100%,0.05) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 25%, transparent 72%)",
            maskImage: "radial-gradient(ellipse at center, black 25%, transparent 72%)",
          }}
        />
        {/* glows verdes */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[hsl(88_55%_50%)]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-[hsl(101_60%_45%)]/25 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center px-12 text-center">
          <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-black/40 ring-1 ring-white/10">
            <Image src="/logo_erp.png" alt="ERP Escola — TEC Unicentro" width={1920} height={819} priority className="w-full max-w-md" />
          </div>
          <p className="mt-8 max-w-sm text-sm text-white/70">
            Plataforma de gestão acadêmica, financeira e pedagógica da Escola Técnica Unicentro.
          </p>
        </div>
      </div>

      {/* Toggle de tema flutuante */}
      <div className="fixed bottom-6 right-6 z-50">
        <ThemeToggle />
      </div>
    </div>
  );
}
