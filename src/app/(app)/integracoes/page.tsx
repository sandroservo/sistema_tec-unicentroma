"use client";

// TODO: link no app-sidebar (Integrações)

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status = { evolution: boolean; pix: boolean; assinatura: boolean };

async function getStatus(): Promise<Status> {
  const res = await fetch("/api/integracoes/status");
  if (!res.ok) throw new Error("Erro ao carregar status");
  return res.json();
}

const integracoes = [
  {
    key: "evolution" as const,
    nome: "Evolution API (WhatsApp)",
    descricao: "Envio de comunicados via WhatsApp self-hosted.",
    envs: ["EVOLUTION_API_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE"],
  },
  {
    key: "pix" as const,
    nome: "PIX (Banco)",
    descricao: "Geração de cobranças PIX para parcelas.",
    envs: ["PIX_PROVIDER_URL", "PIX_PROVIDER_KEY"],
  },
  {
    key: "assinatura" as const,
    nome: "Assinatura Eletrônica",
    descricao: "Solicitação de assinatura de contratos.",
    envs: ["ASSINATURA_PROVIDER_URL", "ASSINATURA_PROVIDER_KEY"],
  },
];

export default function IntegracoesPage() {
  const { data: status, isLoading } = useQuery({ queryKey: ["integracoes-status"], queryFn: getStatus });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground">Configuração de serviços externos via variáveis de ambiente no servidor.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {integracoes.map((i) => {
          const ok = status?.[i.key];
          return (
            <Card key={i.key}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">{i.nome}</CardTitle>
                {isLoading ? (
                  <Badge variant="secondary">...</Badge>
                ) : ok ? (
                  <Badge>Configurado</Badge>
                ) : (
                  <Badge variant="destructive">Não configurado</Badge>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">{i.descricao}</p>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Variáveis necessárias:</span>
                  {i.envs.map((e) => (
                    <code key={e} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono w-fit">{e}</code>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
