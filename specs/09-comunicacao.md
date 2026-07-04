# 09 — Comunicação

## Escopo
Três mecanismos: **notificações in-app por usuário** (sino + SSE), **comunicados broadcast** (notificação/WhatsApp/e-mail para públicos de alunos) e **mural de avisos** (feed filtrado por papel). Emissões automáticas de notificação já existem em matrícula, requerimento e rematrícula.

## Models (Prisma)
- **Notificacao** — `userId` (FK User, cascade), titulo, mensagem, `tipo` (`info|sucesso|alerta|erro`), `link?`, `lida`. Índice `[userId, lida]`.
- **Comunicado** — titulo, mensagem, `canal` (`notificacao|whatsapp|email`), `destinatarios` (qtde enviada), `status` (`enviado|parcial|falhou`). Log do broadcast, não guarda destinatários individuais.
- **Aviso** — titulo, conteudo, `publico` (`todos|alunos|professores|responsaveis`), `fixado`, `ativo`, `autorUserId?`, `expiraEm?` (@db.Date). Índice `[publico, ativo]`.

## API
| Rota | Permissão | Comportamento |
|---|---|---|
| GET `/api/notificacoes` | qualquer logado | Últimas 50 do próprio usuário + contador `naoLidas`. |
| PATCH `/api/notificacoes` | qualquer logado | Marca lida: com `{id}` uma; sem body, **todas** (updateMany escopado ao userId). |
| GET `/api/notificacoes/stream` | qualquer logado | **SSE** (`text/event-stream`, runtime nodejs, force-dynamic): envia `{naoLidas}` imediatamente e a cada **15s** (setInterval + poll no BD); erro de query é tolerado (próximo tick). |
| GET `/api/comunicados` | `comunicacao:enviar` | Últimos 50 comunicados. |
| POST `/api/comunicados` | `comunicacao:enviar` | Broadcast **síncrono**: resolve público (`todos_alunos` = alunos `ativo`; `inadimplentes` = alunos com parcela `pendente|vencido` vencida), envia por canal: `notificacao` → `createNotificacao` (falha se aluno sem User), `email` → `enviarEmail` (pula sem e-mail), `whatsapp` → `enviarWhatsapp` (pula sem telefone). Grava Comunicado com `destinatarios=enviados` e `status = enviado | parcial | falhou`. Audita canal/público/contagens. |
| GET `/api/avisos` | `aviso:ler` | Todos os avisos, fixados primeiro. |
| POST `/api/avisos` | `aviso:criar` | Cria (Zod: titulo ≤200, publico enum, expiraEm nullish); `autorUserId` = sessão. |
| GET/PATCH/DELETE `/api/avisos/[id]` | `aviso:ler`/`aviso:editar`/`aviso:excluir` | CRUD com audit antes/depois. |
| GET `/api/avisos/feed` | qualquer logado | Feed **filtrado no backend**: só `ativo` e não-expirado (`expiraEm null` ou `>= hoje`); papel aluno/professor/responsavel vê `todos` + seu público; papéis administrativos veem qualquer público. Top 20, fixados primeiro. |

## Telas / Componentes
- `src/components/notification-bell.tsx` — sino no header (admin e portais): TanStack Query em `/api/notificacoes`, `EventSource` no stream atualiza contador e invalida a lista; badge 99+; clique marca lida e navega pelo `link`; "Marcar todas como lidas". Fallback silencioso em 401.
- `/(app)/comunicados` — form de envio (título/mensagem/canal/público) + histórico.
- `/(app)/avisos` — "Mural de Avisos": CRUD em dialogs (novo/editar) + AlertDialog de exclusão.
- `src/components/mural-widget.tsx` — card "Mural de Avisos" consumindo `/api/avisos/feed`; presente nos **4 painéis**: `/(app)/page.tsx`, `/portal/aluno`, `/portal/professor`, `/portal/responsavel`.

## Regras de negócio
- Notificação é sempre best-effort (`lib/notify.ts` engole erros): nunca derruba a operação de origem. `notificarAluno` resolve o User vinculado ao Aluno (no-op sem vínculo).
- Emissões automáticas existentes: **matrícula criada** (POST `/api/matriculas` → "Matrícula confirmada", sucesso, link portal), **requerimento atualizado** (PATCH `/api/requerimentos/[id]` → título com status, protocolo na mensagem), **rematrícula aprovada/recusada** (PATCH `/api/rematriculas/[id]` → sucesso/erro).
- SSE é polling server-side de 15s (não é push por trigger); browser reabre o EventSource sozinho após erro.
- Filtro do feed de avisos é no backend — aluno não recebe avisos de professores mesmo forjando o fetch.

## Débitos
- Broadcast é síncrono no request (loop sequencial de e-mails/WhatsApp) — fila (pg-boss) planejada e não instalada; envios grandes podem estourar timeout.
- Comunicado não persiste falhas por destinatário (só contagens) e não tem reenvio.
- Público de comunicados limitado a alunos (`todos_alunos|inadimplentes`); sem professores/responsáveis, sem turma específica.
- SSE poll de 15s por conexão aberta = 1 query/15s/usuário logado.

## Como testar
1. Logar em duas sessões (admin + aluno). Admin cria matrícula p/ o aluno → sino do aluno atualiza em ≤15s (SSE) com "Matrícula confirmada".
2. `/comunicados`: enviar canal `notificacao` público `todos_alunos` → histórico mostra status/destinatários; sem SMTP, canal `email` loga no console e status `falhou`.
3. `/avisos`: criar aviso público `alunos` fixado → aparece no mural do portal do aluno e do admin, some do portal do professor; setar `expiraEm` no passado → some do feed.
4. PATCH `/api/notificacoes` sem body → zera contador.
