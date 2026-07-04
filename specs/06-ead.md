# 06 — EAD

## Escopo
Conteúdo EAD por curso (módulos → aulas), progresso do aluno, questionários com autocorreção, fórum por curso e entrega de atividades por aula. Admin monta o conteúdo em `/(app)/ead`; aluno consome no portal (`/portal/aluno/ead`) — sempre validando matrícula ativa no curso.

## Models (Prisma)
- **ModuloEad** — `cursoId` (FK Curso, cascade), titulo, descricao?, ordem. Índice `[cursoId, ordem]`.
- **AulaEad** — `moduloId` (cascade), titulo, `tipo` (`video|pdf|texto|link`), `url?` (embed/pdf/link), `conteudo?` (markdown quando texto), ordem, `duracaoMin?`.
- **ProgressoAula** — `@@unique([aulaId, alunoId])`, `concluido`, `concluidoEm?`.
- **Questionario** — `moduloId` (cascade), titulo, `notaMinima?` Decimal(4,2).
- **Questao** — `questionarioId` (cascade), enunciado, `tipo` (`multipla|vf|dissertativa`), `opcoes` Json?, `respostaCorreta?`, `peso` Decimal(4,2) default 1, ordem.
- **TentativaQuestionario** — questionarioId, alunoId, `nota?` Decimal(4,2), `respostas` Json (`{questaoId: resposta}`).
- **Forum** — `cursoId` (cascade), titulo. **PostForum** — forumId, `autorUserId` (User.id), mensagem, `parentId?` (respostas aninhadas via self-relation).
- **EntregaAtividade** — `@@unique([aulaId, alunoId])`, texto?, documentoId?, `nota?`, feedback?, `status` (`enviada|corrigida`).

## API
| Rota | Permissão | Comportamento |
|---|---|---|
| GET/POST `/api/ead/modulos` | `ead:ler` / `ead:criar` | Lista (filtro `?cursoId`, inclui `totalAulas`) / cria módulo. Audita. |
| GET/PATCH/DELETE `/api/ead/modulos/[id]` | `ead:ler`/`ead:editar`/`ead:excluir` | CRUD módulo. |
| GET/POST `/api/ead/aulas` | `ead:ler` / `ead:criar` | Lista (filtro `?moduloId`) / cria aula (tipo validado por enum Zod). |
| GET/PATCH/DELETE `/api/ead/aulas/[id]` | `ead:ler`/`ead:editar`/`ead:excluir` | CRUD aula. |
| GET/POST `/api/ead/questionarios` | logado (GET) / `ead:criar` (POST) | Lista (filtro `?moduloId`) / cria. Serializa `notaMinima` como number. |
| GET/PATCH/DELETE `/api/ead/questionarios/[id]` | `ead:ler`/`ead:editar`/`ead:excluir` | CRUD questionário. |
| GET `/api/ead/questoes` | **qualquer logado** (`currentUser`) | Lista questões (filtro `?questionarioId`). **`respostaCorreta` NUNCA é selecionada** — gabarito não vai ao client. |
| POST `/api/ead/questoes` | `ead:criar` | Cria questão (com gabarito). PATCH/DELETE `[id]`: `ead:editar`/`ead:excluir`. |
| GET/POST `/api/ead/tentativas` | **aluno** (`requireAluno`) | GET (`?questionarioId`, obrig.): tentativas do próprio aluno (só id/nota/criadoEm). POST: autocorreção — ver Regras. |
| GET/POST `/api/ead/foruns` | logado / `ead:criar` | Lista fóruns (`?cursoId`) / cria fórum. |
| GET/POST `/api/ead/posts` | qualquer logado | Lista posts (`?forumId`, resolve `autorNome` via join em User) / posta com `autorUserId` = sessão; `parentId` p/ resposta. |
| GET/POST `/api/ead/entregas` | **aluno** (`requireAluno`) | GET (`?aulaId` obrig.): entrega do próprio aluno ou null. POST: **upsert** por `aulaId+alunoId`, status volta a `enviada`. |
| PATCH `/api/ead/entregas/[id]` | `ead:corrigir` | Lança `nota`+`feedback`, status → `corrigida`. Audita. |
| GET `/api/portal/aluno/ead/cursos` | aluno | Cursos das matrículas **ativas** que têm ModuloEad, com totalAulas/aulasConcluidas/percentual. |
| GET `/api/portal/aluno/ead/curso/[cursoId]` | aluno | 403 se não houver matrícula ativa no curso. Módulos+aulas ordenados com flag `concluido` por aula. |
| PUT `/api/portal/aluno/ead/progresso` | aluno | Valida que a aula pertence a curso com matrícula ativa (403), upsert ProgressoAula. |

## Telas
- `/(app)/ead` — cards de cursos com conteúdo EAD ("EAD — Conteúdo").
- `/(app)/ead/[cursoId]` — builder: lista de módulos com aulas; `ModuloDialog` e `AulaDialog` (criar/editar em dialog).
- `/portal/aluno/ead` — "Meus cursos EAD": cards com percentual de progresso.
- `/portal/aluno/ead/[cursoId]` — player com tabs **Conteúdo** (aulas por módulo; vídeo/pdf via `<iframe>`, texto renderizado; botão "Marcar como concluída"; componente `Entrega` por aula; componente `Quiz` por módulo com envio de respostas) e **Fórum** (posts do curso).

## Regras de negócio
- **Autocorreção** (POST `/api/ead/tentativas`): só questões `multipla|vf` contam; dissertativas são ignoradas (correção manual futura). `nota = 10 * Σpeso(acertos) / Σpeso(objetivas)`; comparação case-insensitive com trim. Sem questões objetivas → nota 0. Resposta inclui `aprovado` (nota ≥ notaMinima) quando notaMinima existe.
- Gabarito nunca é exposto: GET questoes usa `select` sem `respostaCorreta`; a nota é calculada server-side.
- Escopo do portal: toda leitura/escrita do aluno passa por `requireAluno` + checagem de matrícula ativa no curso (`status: "ativa"`).
- Entrega é única por aula+aluno (upsert); reenvio sobrescreve e reseta status para `enviada`.
- Tentativas são ilimitadas (sem limite de tentativas no código).

## Débitos
- **Aula ao vivo / chat em tempo real (socket.io) não implementado** — exigiria custom server; realtime atual é só SSE de notificações.
- ~~Quiz invisível p/ aluno (403 em questionarios)~~ CORRIGIDO: GET questionarios agora exige apenas login.
- Sem UI admin para questionários/questões, fóruns e correção de entregas (`ead:corrigir`) — APIs existem, telas não.
- Entrega por arquivo: campo `documentoId` existe mas o player só envia texto (sem upload no form).
- Sem limite de tentativas nem trava por notaMinima.

## Como testar
1. Como admin: criar módulo e aulas em `/ead/[cursoId]`; criar questionário/questões via API (`POST /api/ead/questionarios`, `/api/ead/questoes` com `respostaCorreta`).
2. Como aluno matriculado (seed demo): `/portal/aluno/ead` → abrir curso → marcar aula concluída (percentual sobe); enviar entrega; conferir 403 ao acessar `curso/[cursoId]` de curso não matriculado.
3. `POST /api/ead/tentativas` com respostas certas/erradas → conferir nota ponderada e que GET `/api/ead/questoes` não traz `respostaCorreta`.
4. Como professor: `PATCH /api/ead/entregas/[id]` com nota → status `corrigida`.
