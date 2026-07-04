"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const METODOS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_debito: "Cartão de débito",
  cartao_credito: "Cartão de crédito",
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Aluno = { id: number; nome: string; cpf: string };
type Debito = {
  tipo: "cobranca" | "parcela";
  id: number;
  descricao: string;
  valor: number;
  vencimento: string | null;
  vencido: boolean;
};
type Recebimento = {
  id: number;
  alunoNome: string;
  valor: number;
  metodo: string;
  itens: number;
  criadoEm: string;
};

export default function CaixaPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Passo 1 — busca de aluno
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [aluno, setAluno] = useState<Aluno | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const { data: alunos } = useQuery<Aluno[]>({
    queryKey: ["caixa-alunos", buscaDebounced],
    queryFn: () =>
      fetch(`/api/alunos?search=${encodeURIComponent(buscaDebounced)}&limit=10`)
        .then((r) => r.json())
        .then((j) => j.data ?? []),
    enabled: buscaDebounced.length >= 2 && !aluno,
  });

  // Passo 2 — débitos
  const { data: debitos, isLoading: carregandoDebitos } = useQuery<{ itens: Debito[]; total: number }>({
    queryKey: ["caixa-debitos", aluno?.id],
    queryFn: () => fetch(`/api/caixa/debitos?alunoId=${aluno!.id}`).then((r) => r.json()),
    enabled: !!aluno,
  });

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const chave = (d: Debito) => `${d.tipo}:${d.id}`;
  const itensSelecionados = (debitos?.itens ?? []).filter((d) => selecionados.has(chave(d)));
  const totalSelecionado = Math.round(itensSelecionados.reduce((s, d) => s + d.valor, 0) * 100) / 100;

  // Passo 3 — pagamento
  const [metodo, setMetodo] = useState("dinheiro");
  const [valorRecebido, setValorRecebido] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const recebidoNum = parseFloat(valorRecebido.replace(",", "."));
  const troco =
    metodo === "dinheiro" && !isNaN(recebidoNum) ? Math.round((recebidoNum - totalSelecionado) * 100) / 100 : null;

  function resetar() {
    setSelecionados(new Set());
    setValorRecebido("");
    setObservacoes("");
    qc.invalidateQueries({ queryKey: ["caixa-debitos"] });
    qc.invalidateQueries({ queryKey: ["recebimentos-hoje"] });
  }

  const confirmar = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/recebimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alunoId: aluno!.id,
          metodo,
          valorRecebido: metodo === "dinheiro" && !isNaN(recebidoNum) ? recebidoNum : undefined,
          observacoes: observacoes || undefined,
          itens: itensSelecionados.map((d) => ({ tipo: d.tipo, id: d.id })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Erro ao registrar recebimento");
      return json as { id: number; valor: number; troco: number };
    },
    onSuccess: (r) => {
      toast({
        title: "Recebimento registrado",
        description: `Total ${brl(r.valor)}${r.troco > 0 ? ` — troco ${brl(r.troco)}` : ""}`,
      });
      window.open(`/api/recebimentos/${r.id}/recibo`, "_blank");
      resetar();
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      qc.invalidateQueries({ queryKey: ["caixa-debitos"] });
    },
  });

  // Recebimentos de hoje
  const hoje = new Date().toISOString().slice(0, 10);
  const { data: recebimentosHoje } = useQuery<Recebimento[]>({
    queryKey: ["recebimentos-hoje", hoje],
    queryFn: () => fetch(`/api/recebimentos?data=${hoje}`).then((r) => r.json()),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Caixa</h1>
        <p className="text-muted-foreground">Recebimento presencial de débitos.</p>
      </div>

      {/* Passo 1 — aluno */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Aluno</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {aluno ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">{aluno.nome}</p>
                <p className="text-sm text-muted-foreground">CPF: {aluno.cpf}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAluno(null);
                  setBusca("");
                  setSelecionados(new Set());
                }}
              >
                Trocar aluno
              </Button>
            </div>
          ) : (
            <>
              <Input
                placeholder="Buscar por nome, e-mail ou CPF…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              {busca.length >= 2 && (
                <div className="rounded-md border divide-y">
                  {alunos?.length ? (
                    alunos.map((a) => (
                      <button
                        key={a.id}
                        className="flex w-full items-center justify-between p-3 text-left hover:bg-accent"
                        onClick={() => setAluno(a)}
                      >
                        <span>{a.nome}</span>
                        <span className="text-sm text-muted-foreground">{a.cpf}</span>
                      </button>
                    ))
                  ) : (
                    <p className="p-3 text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Passo 2 — débitos */}
      {aluno && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Débitos em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carregandoDebitos ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : debitos?.itens.length ? (
                  debitos.itens.map((d) => (
                    <TableRow key={chave(d)}>
                      <TableCell>
                        <Checkbox
                          checked={selecionados.has(chave(d))}
                          onCheckedChange={(c) => {
                            setSelecionados((prev) => {
                              const next = new Set(prev);
                              if (c) next.add(chave(d));
                              else next.delete(chave(d));
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {d.descricao}{" "}
                        {d.vencido && <Badge variant="destructive">vencido</Badge>}
                      </TableCell>
                      <TableCell>
                        {d.vencimento ? new Date(`${d.vencimento}T00:00:00`).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="text-right">{brl(d.valor)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      Nenhum débito em aberto.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end border-t pt-3 text-lg font-semibold">
              TOTAL selecionado: {brl(totalSelecionado)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passo 3 — pagamento */}
      {aluno && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Método</label>
                <Select value={metodo} onValueChange={setMetodo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(METODOS).map(([v, label]) => (
                      <SelectItem key={v} value={v}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {metodo === "dinheiro" && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Valor recebido (R$)</label>
                  <Input
                    inputMode="decimal"
                    placeholder="0,00"
                    value={valorRecebido}
                    onChange={(e) => setValorRecebido(e.target.value)}
                  />
                  {troco !== null && (
                    <p className={`text-sm font-medium ${troco < 0 ? "text-destructive" : ""}`}>
                      {troco < 0 ? `Falta ${brl(-troco)}` : `Troco: ${brl(troco)}`}
                    </p>
                  )}
                </div>
              )}
            </div>
            <Textarea
              placeholder="Observações (opcional)"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
            <div>
              <Button
                disabled={itensSelecionados.length === 0 || confirmar.isPending}
                onClick={() => confirmar.mutate()}
              >
                {confirmar.isPending ? "Registrando…" : "Confirmar recebimento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recebimentos de hoje */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recebimentos de hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Recibo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recebimentosHoje?.length ? (
                recebimentosHoje.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {new Date(r.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>{r.alunoNome}</TableCell>
                    <TableCell>{METODOS[r.metodo] ?? r.metodo}</TableCell>
                    <TableCell>{r.itens}</TableCell>
                    <TableCell className="text-right">{brl(r.valor)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/recebimentos/${r.id}/recibo`, "_blank")}
                      >
                        Recibo
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    Nenhum recebimento hoje.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
