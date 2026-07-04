# 04 — Financeiro

## Escopo
Duas gerações convivendo: **Cobranças legadas** (Fase 0, contrato JSON do Express legado, consumidas via client orval) e **Contratos + Parcelas** (Fase 4) com bolsas, convênios, renegociação, inadimplência, contas a pagar, plano de contas e fluxo de caixa. PIX/NF-e/conciliação são stubs.

## Models (Prisma)
- `Cobranca` — alunoId, descricao, valor Decimal(10,2), vencimento Date, dataPagamento?, status (`pendente|pago|vencido|cancelado`), metodoPagamento?, observacoes.
- `Contrato` — alunoId, cursoId?, turmaId?, valorTotal, numParcelas, diaVencimento (default 10), dataInicio, descontoPercentual (resume bolsa/convênio), bolsaId?, convenioId?, status (`ativo|encerrado|cancelado`).
- `Parcela` — contratoId (onDelete Cascade), numero, valor, vencimento, dataPagamento?, status (`pendente|pago|vencido|cancelado|renegociada`), metodoPagamento (`pix|boleto|cartao|dinheiro`). Índices `[contratoId,status]`, `[vencimento]`.
- `Bolsa` — alunoId, tipo (`integral|parcial`), percentual Decimal(5,2), motivo?, dataInicio/dataFim, ativo.
- `Convenio` — nome, empresa?, percentualDesconto Decimal(5,2), ativo.
- `Renegociacao` — alunoId, contratoOrigemId?, novoContratoId?, valorTotal, numParcelas, motivo?.
- `PlanoConta` — codigo?, nome, tipo (`receita|despesa`), ativo. 1:N com ContaPagar.
- `ContaPagar` — descricao, valor, vencimento, dataPagamento?, status (`pendente|pago|vencido|cancelado`), fornecedor?, planoContaId?.

## API
### Cobranças legadas (contrato Express legado — `valor` como number no JSON, via `cobrancaDTO`)
| Rota | Permissão | Comportamento |
|---|---|---|
| GET `/api/financeiro/cobrancas` | `cobranca:ler` | filtros `alunoId`, `status`; inclui `alunoNome`; ordena por vencimento asc |
| POST `/api/financeiro/cobrancas` | `cobranca:criar` | cria com status `pendente`; audit |
| GET/PATCH `/api/financeiro/cobrancas/[id]` | `cobranca:ler` / `cobranca:editar` | PATCH aceita body livre (spread, sem zod); `status:"pago"` cria `Atividade` tipo `pagamento`; 404 em P2025 |
| GET `/api/financeiro/resumo` | `cobranca:ler` | groupBy status → `{totalRecebido,totalPendente,totalVencido,totalCancelado,inadimplentes}` (inadimplentes = alunos distintos com cobrança `vencido`) |

### Contratos + Parcelas
| Rota | Permissão | Comportamento |
|---|---|---|
| GET `/api/contratos` | `cobranca:ler` | filtros `alunoId`, `status`; devolve `resumoParcelas {total,pagas,pendentes}` |
| POST `/api/contratos` | `cobranca:criar` | zod; resolve `descontoPercentual = descontoEfetivo(bolsa, convenio)`; gera parcelas via `gerarParcelas` e cria contrato+parcelas em `$transaction`; audit; 201 |
| GET `/api/contratos/[id]` | `cobranca:ler` | detalhe com parcelas ordenadas por numero |
| PATCH `/api/contratos/[id]` | `cobranca:editar` | só `status`/`observacoes` — **não regenera parcelas** |
| DELETE `/api/contratos/[id]` | `cobranca:editar` | hard-delete; cascade remove parcelas; 204 |
| GET `/api/parcelas/[id]` | `cobranca:ler` | DTO com valor number, datas date-only |
| PATCH `/api/parcelas/[id]` | `cobranca:editar` | **baixa manual**: zod (`status`,`metodoPagamento`,`dataPagamento`); `status:"pago"` sem data → `dataPagamento = now()`; TODO gateway PIX/boleto |

### Bolsas / Convênios / Plano de contas
| Rota | Permissão | Comportamento |
|---|---|---|
| GET/POST `/api/bolsas` | `cobranca:ler` / `cobranca:criar` | filtros `alunoId`,`ativo`; **tipo `integral` força percentual 100** (também no PATCH); retorna `{data:[...]}` |
| GET/PATCH/DELETE `/api/bolsas/[id]` | `cobranca:ler`/`editar`/`editar` | PATCH sem zod (spread); DELETE hard, 204 |
| GET/POST `/api/convenios` | `cobranca:ler` / `cobranca:criar` | zod no POST; `percentualDesconto` 0–100; `{data:[...]}` |
| GET/PATCH/DELETE `/api/convenios/[id]` | `cobranca:ler`/`editar`/`editar` | PATCH sem zod (spread); DELETE hard, 204 |
| GET/POST `/api/planos-conta` | `despesa:ler` / `despesa:criar` | filtro `tipo`; zod |
| GET/PATCH/DELETE `/api/planos-conta/[id]` | `despesa:ler`/`editar`/`excluir` | zod no PATCH |

### Relatórios / operações
| Rota | Permissão | Comportamento |
|---|---|---|
| GET `/api/financeiro/inadimplencia` | `cobranca:ler` | parcela **em atraso = status ∈ {pendente,vencido} AND vencimento < hoje (UTC 00:00)**; agrega por aluno `{qtdParcelas,valorEmAtraso,diasAtrasoMax}`, ordena por valor desc; `totalEmAtraso`, `totalAlunos` |
| GET `/api/financeiro/parcelas-abertas?alunoId=` | `cobranca:ler` | parcelas `pendente|vencido` dos contratos do aluno (insumo da renegociação); 400 sem alunoId |
| GET `/api/renegociacoes` | `cobranca:ler` | lista com alunoNome resolvido em batch |
| POST `/api/renegociacoes` | `cobranca:editar` | `$transaction`: valida parcelas ∈ contratos do aluno e nenhuma `pago` → marca origem como `renegociada` → cria novo Contrato (`observacoes:"Renegociação"`, valorTotal = Σ parcelas) → gera parcelas via `gerarParcelas` (sem desconto) → registra `Renegociacao` (contratoOrigemId = contrato da 1ª parcela). Erros de validação retornam **400** com a mensagem |
| GET/POST `/api/contas-pagar` | `despesa:ler` / `despesa:criar` | filtros `status`, `mes`+`ano`; **status `vencido` é calculado no read** (`pendente` && vencimento < hoje — não persistido); filtro `status=vencido` traduz para `pendente + vencimento < hoje` |
| GET/PATCH/DELETE `/api/contas-pagar/[id]` | `despesa:ler`/`editar`/`excluir` | PATCH zod (`status`,`dataPagamento`); pago sem data → now() |
| GET `/api/financeiro/fluxo-caixa` | `despesa:ler` | 12 buckets mensais (mês atual − 11); **receita = Cobranca pago + Parcela pago; despesa = ContaPagar pago**; bucket pela `dataPagamento ?? vencimento`; filtra `vencimento >= inicio`; devolve `{series:[{mes,receita,despesa,saldo}],totais}` |

### Stubs (integração pendente)
| Rota | Permissão | Comportamento |
|---|---|---|
| POST `/api/integracoes/pix` | `cobranca:editar` | `{parcelaId}` → `gerarCobrancaPix` (`src/lib/integrations/banco.ts`): sem `PIX_PROVIDER_URL/KEY` retorna stub determinístico (`txid STUB-...`, `copiaECola`, `status:"stub"`); txid **não** é persistido (TODO) |
| POST `/api/nfe` | `cobranca:editar` | **501** `{status:"nao_configurado"}` — TODO provedor NF-e (Focus/NFe.io) |
| POST `/api/conciliacao` | `cobranca:editar` | **501** `{status:"nao_configurado"}` — TODO OFX/API bancária |

## Telas
`(app)/financeiro` (cards resumo + tabela de cobranças, hooks orval `useGetFinanceiroResumo`/`useListCobrancas`, filtro por status) · `(app)/contratos` + `/novo` + `/[id]` (detalhe com parcelas e dialog "Registrar pagamento" → PATCH parcela) · `(app)/renegociacao` · `(app)/inadimplencia` · `(app)/contas-pagar` + `/nova` · `(app)/fluxo-caixa` (Recharts) · `(app)/plano-contas` · `(app)/bolsas` + `/novo` · `(app)/convenios` + `/novo`.

## Regras de negócio
- **`gerarParcelas` (`src/lib/financeiro.ts`, fonte única contratos + renegociação):**
  - `totalLiquido = round2(valorTotal · (1 − desconto/100))`; `base = round2(totalLiquido / n)`.
  - Parcelas 1..n−1 = `base`; **última = totalLiquido − acumulado** (absorve arredondamento → soma fecha exata).
  - Vencimento: mês i−1 à frente de `dataInicio`, com **clamp do dia** para o último dia do mês (dia 31 em fevereiro → 28/29). Tudo em UTC.
  - Self-check: `npx tsx src/lib/financeiro.check.ts`.
- **`descontoEfetivo(bolsaPct, convenioPct)`** = soma, **limitada a 100**. Bolsa `integral` sempre grava percentual 100.
- Cobranças legadas e Parcelas são universos separados; fluxo de caixa soma ambos como receita.
- Renegociação nunca cancela o contrato de origem — só as parcelas viram `renegociada`.

## Débitos
- Nenhum job marca `vencido` em Cobranca/Parcela (status persiste `pendente`); só ContaPagar deriva no read. `resumo.totalVencido/inadimplentes` dependem de status `vencido` que nada seta automaticamente.
- Fluxo de caixa filtra por `vencimento >= inicio` mas bucketiza por `dataPagamento` — pagamento recente de parcela antiga fica fora; pagamento com bucket fora da janela é descartado em silêncio.
- PATCH de cobrança, bolsa e convênio aceitam body sem validação zod (spread).
- PIX é stub e não persiste txid; NF-e e conciliação retornam 501.
- DELETE de contrato/bolsa/convênio é hard-delete (contrato leva as parcelas junto, mesmo pagas).
- `Renegociacao.contratoOrigemId` assume que todas as parcelas vêm do mesmo contrato (usa o da primeira).

## Como testar
1. `npm run db:seed:demo`; login financeiro/admin.
2. POST `/api/contratos` com `valorTotal: 1000, numParcelas: 3, descontoPercentual via bolsa 10%` → parcelas 300.00/300.00/300.00 (900 fecha exato); `diaVencimento: 31` com início em janeiro → parcela de fevereiro clampa p/ 28/29.
3. PATCH `/api/parcelas/[id]` `{status:"pago"}` → `dataPagamento` preenchida; conferir em `/fluxo-caixa`.
4. Criar parcela com vencimento passado → aparece em `/api/financeiro/inadimplencia` e em `/parcelas-abertas`; POST `/api/renegociacoes` com ela → origem vira `renegociada`, novo contrato criado.
5. POST `/api/nfe` e `/api/conciliacao` → 501; POST `/api/integracoes/pix` sem env → `status:"stub"`.
6. `npx tsx src/lib/financeiro.check.ts` → sem asserts falhando.
