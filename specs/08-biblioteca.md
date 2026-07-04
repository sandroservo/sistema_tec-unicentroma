# 08 — Biblioteca

## Escopo
Acervo (títulos → exemplares com código/QR), empréstimo/devolução com multa por atraso, multas e reservas. Papel dedicado `bibliotecario` tem `biblioteca:*` + `aluno:ler`.

## Models (Prisma)
- **Titulo** — titulo, autor?, isbn?, editora?, ano?, categoria?.
- **Exemplar** — tituloId (cascade), `codigo` **@unique** (conteúdo do QR), `status` (`disponivel|emprestado|reservado|manutencao`), localizacao?.
- **Emprestimo** — exemplarId, alunoId, `dataEmprestimo` (now), `dataPrevista` (@db.Date), `dataDevolucao?`, `status` (`aberto|devolvido|atrasado`). Índice `[alunoId, status]`.
- **Reserva** — tituloId (cascade), alunoId, `status` (`ativa|atendida|cancelada`).
- **Multa** — `emprestimoId` **@unique** (1:1), `valor` Decimal(10,2), `paga`.

## API
| Rota | Permissão | Comportamento |
|---|---|---|
| GET/POST `/api/biblioteca/titulos` | `biblioteca:ler` / `biblioteca:criar` | GET busca `?search` (titulo/autor/isbn, insensitive) e agrega `totalExemplares`/`disponiveis`. POST cria (sem Zod, body direto). |
| GET/PATCH/DELETE `/api/biblioteca/titulos/[id]` | `biblioteca:ler`/`editar`/`excluir` | GET inclui exemplares. DELETE via `deleteMany` (204). |
| GET/POST `/api/biblioteca/exemplares` | `biblioteca:ler` / `biblioteca:criar` | GET filtra `?tituloId`. POST gera `codigo` (`EX-` + random base36) se omisso; P2002 → 409 "Código já existe". |
| GET/PATCH/DELETE `/api/biblioteca/exemplares/[id]` | `biblioteca:ler`/`editar`/`excluir` | PATCH só `status`/`localizacao`. |
| GET `/api/biblioteca/exemplares/[id]/qr` | `biblioteca:ler` | **PNG** do QR do `codigo` via lib `qrcode` (`QRCode.toBuffer`), `Content-Type: image/png`, runtime nodejs. |
| GET/POST `/api/biblioteca/emprestimos` | `biblioteca:ler` / `biblioteca:emprestar` | GET filtra `?alunoId&status`; status `atrasado` é **derivado** (aberto + dataPrevista < hoje) e filtrado pós-query; inclui aluno/exemplar/título/multa. POST em **`$transaction`**: exige exemplar `disponivel` (409 `EXEMPLAR_INDISPONIVEL`; 404 se não existe), `dataPrevista = hoje + prazoDias` (**default 14**), cria empréstimo `aberto` e marca exemplar `emprestado`. Audita. |
| POST `/api/biblioteca/emprestimos/[id]/devolver` | `biblioteca:emprestar` | `$transaction`: 409 se já devolvido; seta `devolvido` + `dataDevolucao=hoje`, libera exemplar (`disponivel`); se `hoje > dataPrevista`, cria **Multa = Math.ceil(diasAtraso) × R$ 1,00/dia** (`VALOR_DIARIO=1.0`). Retorna `{devolvido, multa?}`. |
| PATCH `/api/biblioteca/multas/[id]` | `biblioteca:editar` | Seta `paga` (default true se body vazio). |
| GET/POST `/api/biblioteca/reservas` | `biblioteca:ler` / `biblioteca:emprestar` | GET filtra `?tituloId&alunoId&status`. POST cria reserva `ativa`. |
| PATCH `/api/biblioteca/reservas/[id]` | `biblioteca:emprestar` | Status → `ativa|atendida|cancelada`. |

## Telas
- `/(app)/biblioteca` — acervo: busca, dialog de novo título (`/biblioteca/novo`), dialog "Reservar título".
- `/(app)/biblioteca/[id]` — detalhe do título: exemplares (com QR), dialogs de criação/edição.
- `/(app)/biblioteca/emprestimos` — lista de empréstimos com devolução e multas.

## Regras de negócio
- Datas normalizadas para date-only (`new Date(toISOString().slice(0,10))`) — multa conta dias corridos, sem hora.
- `atrasado` nunca é persistido no empréstimo aberto; é calculado na leitura. Só a devolução materializa a multa.
- Multa é 1:1 com empréstimo (unique) e só nasce na devolução em atraso.
- Empréstimo/devolução são transacionais: status do exemplar nunca diverge do empréstimo.

## Débitos
- Devolução tem TODO: **não notifica próximo da fila de reserva** (reserva não vira `atendida` automaticamente nem bloqueia exemplar).
- Sem limite de empréstimos simultâneos por aluno e sem bloqueio por multa pendente.
- POST de títulos/exemplares sem validação Zod (body cru).
- Valor da multa e prazo default são constantes em código (R$1/dia, 14 dias) — sem configuração.
- Aluno não vê seus empréstimos no portal (módulo é só admin/bibliotecário).

## Como testar
1. Criar título + exemplar em `/biblioteca`; abrir `/api/biblioteca/exemplares/[id]/qr` → PNG.
2. Emprestar (POST emprestimos) → exemplar vira `emprestado`; tentar emprestar de novo → 409.
3. Ajustar `dataPrevista` no BD para o passado, devolver → multa criada com `Math.ceil(dias) × 1.00`; `PATCH /api/biblioteca/multas/[id]` → paga.
4. Devolver duas vezes → 409 "já devolvido". Criar/cancelar reserva via `/api/biblioteca/reservas`.
