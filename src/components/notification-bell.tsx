"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Notificacao = {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: string;
  link: string | null;
  lida: boolean;
  criadoEm: string;
};

type Resposta = { itens: Notificacao[]; naoLidas: number };

const tipoCor: Record<string, string> = {
  info: "bg-blue-500",
  sucesso: "bg-green-500",
  alerta: "bg-yellow-500",
  erro: "bg-red-500",
};

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery<Resposta>({
    queryKey: ["notificacoes"],
    queryFn: async () => {
      const r = await fetch("/api/notificacoes");
      if (!r.ok) return { itens: [], naoLidas: 0 }; // 401/deslogado: não quebra
      return r.json();
    },
  });

  // SSE: atualiza contador em tempo real
  useEffect(() => {
    const es = new EventSource("/api/notificacoes/stream");
    es.onmessage = (e) => {
      try {
        const { naoLidas } = JSON.parse(e.data) as { naoLidas: number };
        queryClient.setQueryData<Resposta>(["notificacoes"], (prev) =>
          prev ? { ...prev, naoLidas } : prev,
        );
        // se mudou, revalida a lista
        queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      } catch {
        /* ignora payload inválido */
      }
    };
    es.onerror = () => es.close(); // ponytail: navegador reabre EventSource sozinho ao voltar
    return () => es.close();
  }, [queryClient]);

  const marcarLida = useMutation({
    mutationFn: async (id?: number) => {
      await fetch("/api/notificacoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : {}),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificacoes"] }),
  });

  const itens = data?.itens ?? [];
  const naoLidas = data?.naoLidas ?? 0;

  const onClickItem = (n: Notificacao) => {
    if (!n.lida) marcarLida.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-xs">
              {naoLidas > 99 ? "99+" : naoLidas}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="px-0">Notificações</DropdownMenuLabel>
          {naoLidas > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => marcarLida.mutate(undefined)}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          {itens.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </p>
          ) : (
            itens.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onClickItem(n)}
                className={cn(
                  "flex w-full gap-2 border-b px-3 py-2 text-left text-sm hover:bg-accent",
                  !n.lida && "bg-accent/40",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    tipoCor[n.tipo] ?? "bg-muted-foreground",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{n.titulo}</span>
                  <span className="block text-muted-foreground">{n.mensagem}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.criadoEm), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </span>
              </button>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
