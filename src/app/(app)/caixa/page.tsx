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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";

const METODOS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_debito: "Cartão de débito",
  cartao_credito: "Cartão de crédito",
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const parseValor = (s: string) => parseFloat(s.replace(",", "."));

type Aluno = { id: number; nome: string; cpf: string };
type Debito = {
  tipo: "cobranca" | "parcela";
  id: number;
  descricao: string;
  valor: number;
  vencimento: string | null;
  vencido: boolean;
};
type Totais = { dinheiro: number; pix: number; cartao_debito: number; cartao_credito: number; geral: number };
type SessaoAtual = {
  id: number;
  abertoEm: string;
  abertoPorNome: string | null;
  valorAbertura: number;
  totais: Totais;
  esperadoDinheiro: number;
  numRecebimentos: number;
} | null;
type SessaoResumo = {
  id: number;
  status: string;
  abertoEm: string;
  fechadoEm: string | null;
  abertoPorNome: string | null;
  fechadoPorNome: string | null;
  valorAbertura: number;
  valorFechamento: number | null;
  totais: Totais;
  esperadoDinheiro: number;
  diferenca: number | null;
};
type SessaoDetalhe = SessaoResumo & {
  observacoes: string | null;
  recebimentos: { id: number; alunoNome: string; valor: number; metodo: string; criadoEm: string }[];
};

function corDiferenca(d: number) {
  if (d === 0) return "text-green-600";
  return d < 0 ? "text-destructive" : "text-amber-600";
}

export default function CaixaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Caixa</h1>
        <p className="text-muted-foreground">Recebimento presencial de débitos.</p>
      </div>
      <Tabs defaultValue="caixa">
        <TabsList>
          <TabsTrigger value="caixa">Caixa</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="caixa" className="mt-4">
          <AbaCaixa />
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <AbaHistorico />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Aba Caixa ---------- */

function AbaCaixa() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: sessao, isLoading } = useQuery<SessaoAtual>({
    queryKey: ["caixa-sessao-atual"],
    queryFn: () => fetch("/api/caixa/sessoes/atual").then((r) => r.json()),
  });

  // --- abrir caixa ---
  const [abrirOpen, setAbrirOpen] = useState(false);
  const [fundoStr, setFundoStr] = useState("");
  const [obsAbertura, setObsAbertura] = useState("");
  const abrir = useMutation({
    mutationFn: async () => {
      const v = parseValor(fundoStr);
      const res = await fetch("/api/caixa/sessoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valorAbertura: isNaN(v) ? 0 : v, observacoes: obsAbertura || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Erro ao abrir caixa");
      return json;
    },
    onSuccess: () => {
      toast({ title: "Caixa aberto" });
      setAbrirOpen(false);
      setFundoStr("");
      setObsAbertura("");
      qc.invalidateQueries({ queryKey: ["caixa-sessao-atual"] });
      qc.invalidateQueries({ queryKey: ["caixa-historico"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;

  if (!sessao) {
    return (
      <>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-lg font-medium">Caixa fechado</p>
            <p className="text-sm text-muted-foreground">Abra o caixa para registrar recebimentos.</p>
            <Button onClick={() => setAbrirOpen(true)}>Abrir caixa</Button>
          </CardContent>
        </Card>
        <Dialog open={abrirOpen} onOpenChange={setAbrirOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abrir caixa</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Fundo de troco (R$)</label>
                <Input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={fundoStr}
                  onChange={(e) => setFundoStr(e.target.value)}
                />
              </div>
              <Textarea
                placeholder="Observações (opcional)"
                value={obsAbertura}
                onChange={(e) => setObsAbertura(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button disabled={abrir.isPending} onClick={() => abrir.mutate()}>
                {abrir.isPending ? "Abrindo…" : "Abrir caixa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return <CaixaAberto sessao={sessao} />;
}

function CaixaAberto({ sessao }: { sessao: NonNullable<SessaoAtual> }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  // --- fechar caixa ---
  const [fecharOpen, setFecharOpen] = useState(false);
  const [contadoStr, setContadoStr] = useState("");
  const [obsFechamento, setObsFechamento] = useState("");
  const contado = parseValor(contadoStr);
  const diferenca = !isNaN(contado) ? Math.round((contado - sessao.esperadoDinheiro) * 100) / 100 : null;

  const fechar = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/caixa/sessoes/${sessao.id}/fechar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valorFechamento: contado, observacoes: obsFechamento || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Erro ao fechar caixa");
      return json as { esperadoDinheiro: number; valorFechamento: number; diferenca: number };
    },
    onSuccess: (r) => {
      toast({
        title: "Caixa fechado",
        description: `Esperado ${brl(r.esperadoDinheiro)} · contado ${brl(r.valorFechamento)} · diferença ${brl(r.diferenca)}`,
      });
      setFecharOpen(false);
      qc.invalidateQueries({ queryKey: ["caixa-sessao-atual"] });
      qc.invalidateQueries({ queryKey: ["caixa-historico"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Banner da sessão */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex flex-col gap-1">
            <p className="font-medium">
              <Badge className="mr-2">Caixa aberto</Badge>
              às {hora(sessao.abertoEm)}
              {sessao.abertoPorNome ? ` por ${sessao.abertoPorNome}` : ""} · fundo {brl(sessao.valorAbertura)}
            </p>
            <p className="text-sm text-muted-foreground">
              Recebido: {brl(sessao.totais.geral)} — dinheiro {brl(sessao.totais.dinheiro)} · PIX {brl(sessao.totais.pix)} ·
              débito {brl(sessao.totais.cartao_debito)} · crédito {brl(sessao.totais.cartao_credito)} (
              {sessao.numRecebimentos} recebimento{sessao.numRecebimentos === 1 ? "" : "s"})
            </p>
          </div>
          <Button variant="outline" onClick={() => setFecharOpen(true)}>
            Fechar caixa
          </Button>
        </CardContent>
      </Card>

      <FluxoRecebimento />

      {/* Dialog de fechamento */}
      <Dialog open={fecharOpen} onOpenChange={setFecharOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="rounded-md border p-3 text-sm">
              {Object.entries(METODOS).map(([k, label]) => (
                <div key={k} className="flex justify-between">
                  <span>{label}</span>
                  <span>{brl(sessao.totais[k as keyof Totais])}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t pt-2 font-medium">
                <span>Esperado em dinheiro (fundo + recebido)</span>
                <span>{brl(sessao.esperadoDinheiro)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Valor contado em dinheiro (R$)</label>
              <Input
                inputMode="decimal"
                placeholder="0,00"
                value={contadoStr}
                onChange={(e) => setContadoStr(e.target.value)}
              />
              {diferenca !== null && (
                <p className={`text-sm font-medium ${corDiferenca(diferenca)}`}>
                  {diferenca === 0
                    ? "Confere — diferença R$ 0,00"
                    : diferenca < 0
                      ? `Falta ${brl(-diferenca)}`
                      : `Sobra ${brl(diferenca)}`}
                </p>
              )}
            </div>
            <Textarea
              placeholder="Observações (opcional)"
              value={obsFechamento}
              onChange={(e) => setObsFechamento(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button disabled={isNaN(contado) || fechar.isPending} onClick={() => fechar.mutate()}>
              {fechar.isPending ? "Fechando…" : "Confirmar fechamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Combobox de aluno ---------- */

function AlunoCombobox({ onSelect }: { onSelect: (a: Aluno) => void }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const { data: alunos } = useQuery<Aluno[]>({
    queryKey: ["caixa-alunos", buscaDebounced],
    queryFn: () =>
      fetch(
        buscaDebounced
          ? `/api/alunos?search=${encodeURIComponent(buscaDebounced)}&limit=100`
          : "/api/alunos?limit=100"
      )
        .then((r) => r.json())
        .then((j) => j.data ?? []),
    enabled: open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-start font-normal text-muted-foreground">
          Buscar aluno por nome, e-mail ou CPF…
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Digite para buscar…" value={busca} onValueChange={setBusca} />
          <CommandList>
            <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
            {(alunos ?? []).map((a) => (
              <CommandItem
                key={a.id}
                value={`${a.nome} ${a.cpf}`}
                onSelect={() => {
                  onSelect(a);
                  setOpen(false);
                  setBusca("");
                }}
              >
                <span className="flex-1">{a.nome}</span>
                <span className="text-sm text-muted-foreground">{a.cpf}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Fluxo de recebimento (igual ao anterior, com combobox) ---------- */

function FluxoRecebimento() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [aluno, setAluno] = useState<Aluno | null>(null);

  const { data: debitos, isLoading: carregandoDebitos } = useQuery<{ itens: Debito[]; total: number }>({
    queryKey: ["caixa-debitos", aluno?.id],
    queryFn: () => fetch(`/api/caixa/debitos?alunoId=${aluno!.id}`).then((r) => r.json()),
    enabled: !!aluno,
  });

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const chave = (d: Debito) => `${d.tipo}:${d.id}`;
  const itensSelecionados = (debitos?.itens ?? []).filter((d) => selecionados.has(chave(d)));
  const totalSelecionado = Math.round(itensSelecionados.reduce((s, d) => s + d.valor, 0) * 100) / 100;

  const [metodo, setMetodo] = useState("dinheiro");
  const [valorRecebido, setValorRecebido] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const recebidoNum = parseValor(valorRecebido);
  const troco =
    metodo === "dinheiro" && !isNaN(recebidoNum) ? Math.round((recebidoNum - totalSelecionado) * 100) / 100 : null;

  function resetar() {
    setSelecionados(new Set());
    setValorRecebido("");
    setObservacoes("");
    qc.invalidateQueries({ queryKey: ["caixa-debitos"] });
    qc.invalidateQueries({ queryKey: ["caixa-sessao-atual"] });
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
      qc.invalidateQueries({ queryKey: ["caixa-sessao-atual"] });
    },
  });

  return (
    <>
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
                  setSelecionados(new Set());
                }}
              >
                Trocar aluno
              </Button>
            </div>
          ) : (
            <AlunoCombobox onSelect={setAluno} />
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
                        {d.descricao} {d.vencido && <Badge variant="destructive">vencido</Badge>}
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
    </>
  );
}

/* ---------- Aba Histórico ---------- */

function AbaHistorico() {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [status, setStatus] = useState("todos");
  const [detalheId, setDetalheId] = useState<number | null>(null);

  const params = new URLSearchParams();
  if (de) params.set("de", de);
  if (ate) params.set("ate", ate);
  if (status !== "todos") params.set("status", status);

  const { data: sessoes, isLoading } = useQuery<SessaoResumo[]>({
    queryKey: ["caixa-historico", de, ate, status],
    queryFn: () => fetch(`/api/caixa/sessoes?${params}`).then((r) => r.json()),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Caixas anteriores</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">De</label>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Até</label>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Abertura</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead className="text-right">Fundo</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead className="text-right">Esperado (dinheiro)</TableHead>
              <TableHead className="text-right">Contado</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-20 text-center">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : sessoes?.length ? (
              sessoes.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetalheId(s.id)}>
                  <TableCell>
                    {new Date(s.abertoEm).toLocaleDateString("pt-BR")} {hora(s.abertoEm)}
                  </TableCell>
                  <TableCell>{s.abertoPorNome ?? "—"}</TableCell>
                  <TableCell className="text-right">{brl(s.valorAbertura)}</TableCell>
                  <TableCell className="text-right">{brl(s.totais.geral)}</TableCell>
                  <TableCell className="text-right">{brl(s.esperadoDinheiro)}</TableCell>
                  <TableCell className="text-right">
                    {s.valorFechamento !== null ? brl(s.valorFechamento) : "—"}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${s.diferenca !== null ? corDiferenca(s.diferenca) : ""}`}>
                    {s.diferenca !== null ? brl(s.diferenca) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === "aberto" ? "default" : "secondary"}>{s.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                  Nenhuma sessão encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <SessaoDetalheDialog id={detalheId} onClose={() => setDetalheId(null)} />
    </Card>
  );
}

function SessaoDetalheDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data: s } = useQuery<SessaoDetalhe>({
    queryKey: ["caixa-sessao", id],
    queryFn: () => fetch(`/api/caixa/sessoes/${id}`).then((r) => r.json()),
    enabled: id !== null,
  });

  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Caixa #{id}</DialogTitle>
        </DialogHeader>
        {s ? (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground">
              Aberto em {new Date(s.abertoEm).toLocaleDateString("pt-BR")} {hora(s.abertoEm)}
              {s.abertoPorNome ? ` por ${s.abertoPorNome}` : ""}
              {s.fechadoEm
                ? ` · fechado em ${new Date(s.fechadoEm).toLocaleDateString("pt-BR")} ${hora(s.fechadoEm)}${s.fechadoPorNome ? ` por ${s.fechadoPorNome}` : ""}`
                : " · ainda aberto"}
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="flex justify-between">
                <span>Fundo de troco</span>
                <span>{brl(s.valorAbertura)}</span>
              </div>
              {Object.entries(METODOS).map(([k, label]) => (
                <div key={k} className="flex justify-between">
                  <span>{label}</span>
                  <span>{brl(s.totais[k as keyof Totais])}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t pt-2 font-medium">
                <span>Esperado em dinheiro</span>
                <span>{brl(s.esperadoDinheiro)}</span>
              </div>
              {s.valorFechamento !== null && (
                <>
                  <div className="flex justify-between">
                    <span>Contado</span>
                    <span>{brl(s.valorFechamento)}</span>
                  </div>
                  <div className={`flex justify-between font-medium ${corDiferenca(s.diferenca!)}`}>
                    <span>Diferença</span>
                    <span>{brl(s.diferenca!)}</span>
                  </div>
                </>
              )}
              {s.observacoes && <p className="mt-2 border-t pt-2 text-muted-foreground">{s.observacoes}</p>}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Recibo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.recebimentos.length ? (
                  s.recebimentos.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{hora(r.criadoEm)}</TableCell>
                      <TableCell>{r.alunoNome}</TableCell>
                      <TableCell>{METODOS[r.metodo] ?? r.metodo}</TableCell>
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
                    <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                      Nenhum recebimento nesta sessão.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground">Carregando…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
