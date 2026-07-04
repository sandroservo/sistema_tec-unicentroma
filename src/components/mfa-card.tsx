"use client";

import { useState } from "react";
import Image from "next/image";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Setup = { secret: string; otpauthUrl: string; qr: string };

export function MfaCard({ enabled: enabledInitial }: { enabled: boolean }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(enabledInitial);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [codigo, setCodigo] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function iniciar() {
    setLoading(true);
    try {
      const data = await fetch("/api/mfa/setup").then((r) => r.json());
      setSetup(data);
    } finally {
      setLoading(false);
    }
  }

  async function confirmar() {
    if (!setup) return;
    setLoading(true);
    try {
      const res = await fetch("/api/mfa/enable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret: setup.secret, codigo }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.error ?? "Código inválido", variant: "destructive" });
        return;
      }
      setRecovery(data.recoveryCodes);
      setEnabled(true);
      setSetup(null);
      setCodigo("");
      toast({ title: "MFA ativado", description: "Guarde seus códigos de recuperação." });
    } finally {
      setLoading(false);
    }
  }

  async function desativar() {
    setLoading(true);
    try {
      const res = await fetch("/api/mfa/disable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro", description: data.error ?? "Código inválido", variant: "destructive" });
        return;
      }
      setEnabled(false);
      setCodigo("");
      setRecovery(null);
      toast({ title: "MFA desativado" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {enabled ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldAlert className="h-5 w-5 text-muted-foreground" />}
            Verificação em duas etapas (2FA)
          </CardTitle>
          <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Ativo" : "Inativo"}</Badge>
        </div>
        <CardDescription>
          Protege sua conta exigindo um código do app autenticador (Google Authenticator, Authy...) no login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recovery && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="mb-2 text-sm font-medium">Códigos de recuperação — guarde agora, não serão exibidos de novo:</p>
            <div className="grid grid-cols-2 gap-1 font-mono text-sm">
              {recovery.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {!enabled && !setup && (
          <Button onClick={iniciar} disabled={loading}>
            {loading ? "..." : "Ativar 2FA"}
          </Button>
        )}

        {!enabled && setup && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Escaneie o QR no seu app autenticador e digite o código gerado.
            </p>
            <Image src={setup.qr} alt="QR Code MFA" width={200} height={200} className="rounded-md border" unoptimized />
            <p className="break-all text-xs text-muted-foreground">
              Ou insira manualmente: <span className="font-mono">{setup.secret}</span>
            </p>
            <div className="flex gap-2">
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="000000"
                inputMode="numeric"
                className="max-w-[140px]"
              />
              <Button onClick={confirmar} disabled={loading || codigo.length < 6}>
                Confirmar
              </Button>
            </div>
          </div>
        )}

        {enabled && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Para desativar, informe um código atual (ou de recuperação).</p>
            <div className="flex gap-2">
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="000000"
                inputMode="numeric"
                className="max-w-[180px]"
              />
              <Button variant="destructive" onClick={desativar} disabled={loading || codigo.length < 6}>
                Desativar 2FA
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
