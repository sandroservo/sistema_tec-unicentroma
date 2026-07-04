# 02 — Acadêmico

## Escopo
Cadastros acadêmicos: alunos (soft-delete), responsáveis (m2m + User), professores, cursos, turmas, disciplinas, salas, matrículas (com side-effects), rematrículas (portal→admin) e calendário acadêmico. Detalhe pedagógico (diário, notas, avaliações) na spec 03.

## Models (Prisma)
| Model | Campos-chave | Particularidades |
|---|---|---|
| `Aluno` | nome, `email/cpf @unique`, `dataNascimento @db.Date`, endereço/cidade/estado/cep, status ("ativo"), foto | **Soft-delete**: `excluidoEm DateTime?`; `atualizadoEm @updatedAt`; hub de relações (matriculas, notas, cobrancas, presencas, ocorrencias, responsaveis m2m, rematriculas…) |
| `Responsavel` | nome, `email @unique`, `cpf? @unique`, parentesco (pai\|mae\|responsavel) | `alunos Aluno[]` m2m implícito; `usuario User?` 1:1 |
| `Professor` | nome, `email/cpf @unique`, especialidade, titulacao, status | 1:1 opcional com User |
| `Curso` | nome, cargaHoraria, modalidade ("presencial"), `valor Decimal(10,2)`, status, area | valor gravado como string |
| `Disciplina` | nome, cargaHoraria, cursoId, professorId?, `periodo Int?`, `obrigatoria Bool @default(true)` | `planoEnsino` 1:1 (spec 03) |
| `Turma` | nome, cursoId, professorId?, `dataInicio/dataFim @db.Date`, horario, `vagas` (30), `vagasOcupadas`, status ("planejada"), salaId?, anoLetivo?, semestre? | vagasOcupadas mantido por matrícula/rematrícula |
| `Sala` | nome, bloco, capacidade, tipo (sala\|laboratorio\|auditorio), recursos, ativo | |
| `Matricula` | alunoId, turmaId, status ("ativa"), dataMatricula (now), observacoes | Sem unique (aluno,turma) |
| `Rematricula` | alunoId, turmaDestinoId, periodoLetivo ("2026.2"), status (solicitada\|aprovada\|recusada), processadaPorUserId? | `@@index([status])` |
| `CalendarioEvento` | titulo, tipo (feriado\|prova\|recesso\|evento\|conselho\|formatura\|inicio_semestre\|fim_semestre), `dataInicio/dataFim @db.Date`, descricao | `@@index([dataInicio])` |
| `Atividade` | tipo, descricao | Feed "atividades recentes" do dashboard |

## API
| Rota | Permissão | Comportamento |
|---|---|---|
| `GET/POST /api/alunos` | `aluno:ler` / `aluno:criar` | GET: filtro `search` (nome/email/cpf), `status`, paginado `{data,total,page,limit}` (limit≤100), sempre `where excluidoEm:null`. POST sem zod (body direto), `alunoDTO` legado |
| `GET/PATCH/DELETE /api/alunos/[id]` | `aluno:ler/editar/excluir` | DELETE = **soft-delete**: seta `excluidoEm` + `status:"inativo"` (preserva FKs); 404 se já excluído |
| `GET /api/alunos/[id]/notas` | `nota:ler` | Notas legadas do aluno (com nomes achatados) |
| `GET /api/alunos/[id]/financeiro` | `cobranca:ler` | Cobranças do aluno ordenadas por vencimento |
| `GET/POST /api/responsaveis` | `aluno:editar` (sem recurso próprio) | POST em tx: cria Responsavel + conecta `alunoIds` (m2m) + **cria User** papel "responsavel" com senha (bcrypt) e `responsavelId`. P2002 → 409 |
| `GET/PATCH/DELETE /api/responsaveis/[id]` | `aluno:editar` | PATCH: `alunoIds` → `alunos:{set}` (substitui vínculos). DELETE em tx: apaga User espelho + Responsavel (hard) |
| `GET/POST /api/professores`, `GET/PATCH/DELETE /api/professores/[id]` | `professor:ler/criar/editar/excluir` | CRUD simples, sem zod; DELETE hard |
| `GET/POST /api/cursos`, `GET/PATCH/DELETE /api/cursos/[id]` | `curso:*` por ação | Filtros search/modalidade/status; `valor` coagido p/ string; DELETE hard |
| `GET/POST /api/turmas`, `GET/PATCH/DELETE /api/turmas/[id]` | `turma:*` por ação | Flatten cursoNome/professorNome; POST força `vagasOcupadas:0`; **POST ignora salaId/anoLetivo/semestre**; DELETE hard |
| `GET /api/turmas/[id]/alunos` | `turma:ler` | Alunos das matrículas ativas da turma |
| `GET /api/turmas/[id]/frequencia`, `GET /api/turmas/[id]/medias` | `frequencia:ler` / `nota:ler` | Ver spec 03 |
| `GET/POST /api/disciplinas`, `GET/PATCH/DELETE /api/disciplinas/[id]` | `disciplina:*` por ação | Filtro `cursoId`; aceita periodo/obrigatoria; `[id]/plano` → spec 03 |
| `GET/POST /api/salas`, `GET/PATCH/DELETE /api/salas/[id]` | `sala:*` por ação | Zod (tipo enum); DELETE hard |
| `GET/POST /api/matriculas` | `matricula:ler/criar` | GET: filtros alunoId/turmaId/status, flatten. POST **side-effects**: cria Matricula "ativa" → `turma.vagasOcupadas +1` → cria `Atividade` (feed dashboard) → audita → `notificarAluno` ("Matrícula confirmada", link portal) |
| `GET/PATCH /api/matriculas/[id]` | `matricula:ler/editar` | PATCH livre (status etc.). **Sem DELETE** |
| `GET /api/rematriculas` | `matricula:ler` | Lista com filtro status, flatten aluno/turma/curso |
| `PATCH /api/rematriculas/[id]` | `matricula:criar` | Só `status: aprovada\|recusada`; 409 se já processada. Aprovada: valida vagas → tx (cria Matricula ativa + `vagasOcupadas +1` + atualiza rematrícula com `processadaPorUserId`). Ambas: audita + notifica aluno |
| `GET/POST /api/portal/aluno/rematricula` | `requireAluno` | GET: solicitações do aluno + turmas planejada/em_andamento com vaga. POST: valida vaga, 409 se já há pendente p/ a turma, cria "solicitada" |
| `GET/POST /api/calendario`, `GET/PATCH/DELETE /api/calendario/[id]` | `calendario:*` por ação | Zod (tipo enum); filtros `tipo`/`ano` (range do ano); datas serializadas `dateOnly` |

Todas as escritas auditam via `logAudit`.

## Telas
| Rota | O que faz |
|---|---|
| `/alunos`, `/alunos/novo`, `/alunos/[id]`, `/alunos/[id]/editar` | CRUD completo (padrão de referência p/ edição); detalhe com notas/financeiro/documentos/PDFs |
| `/responsaveis`, `/responsaveis/novo` | Lista (nº de alunos) + criação com vínculo de alunos e senha do User |
| `/professores`, `/professores/novo` | Lista + criação |
| `/cursos`, `/cursos/novo`, `/cursos/[id]/editar` | CRUD com edição |
| `/turmas`, `/turmas/novo`, `/turmas/[id]` | Lista, criação, detalhe (dados + alunos matriculados com link) |
| `/disciplinas`, `/disciplinas/novo`, `/disciplinas/[id]/plano` | Lista, criação, plano de ensino (spec 03) |
| `/salas`, `/salas/novo` | Lista + criação |
| `/matriculas` | Lista/criação de matrículas |
| `/rematriculas` | Fila de solicitações; aprovar/recusar com observação (PATCH) |
| `/calendario`, `/calendario/novo` | **FullCalendar** (dayGrid/timeGrid/interaction); CRUD de eventos inline; `end` +1 dia (exclusivo) p/ eventos de dia inteiro |
| Portal: `/portal/aluno/rematricula` | Aluno solicita rematrícula (turmas com vaga) e acompanha status |

## Regras de negócio
- Aluno nunca é removido fisicamente: `excluidoEm` + status inativo; todas as listagens filtram `excluidoEm: null`.
- Criar responsável = criar login junto (papel `responsavel`, vínculo `responsavelId`); excluir responsável apaga o login junto (tx).
- Matrícula: incrementa `vagasOcupadas`, gera Atividade e Notificação (best-effort, `src/lib/notify.ts`).
- Rematrícula: fluxo portal solicita → admin processa; aprovação é transacional e reusa o side-effect de vagas; recusada não mexe em vagas.
- Identificação de aluno/professor no login vem do `User.alunoId/professorId` (spec 01), não do e-mail.

## Débitos
- `POST /api/matriculas` **não valida vagas nem duplicidade** (aluno pode ser matriculado 2x na mesma turma; turma lotada aceita); increment de vagas fora de transação. Rematrícula valida, matrícula direta não.
- Sem cancelamento de matrícula (nenhum DELETE; PATCH de status não decrementa `vagasOcupadas`).
- Hard delete em professores, cursos, turmas, disciplinas, salas (soft-delete só em Aluno) — FK constraint estoura com histórico.
- Páginas de edição faltam: professores, turmas, disciplinas, salas, responsáveis (padrão pronto em `/alunos/[id]/editar` e `/cursos/[id]/editar`).
- `POST/PATCH /api/alunos` e professores sem validação zod (body cru no Prisma).
- `POST /api/turmas` não persiste salaId/anoLetivo/semestre (campos existem no model).
- Responsáveis usam permissão `aluno:editar` (não há recurso `responsavel:*` na matriz); PATCH do responsável não sincroniza nome/email do User espelho.
- TODOs de sidebar: `/salas` sem link no app-sidebar (comentário no page).

## Como testar
1. `npm run db:seed:demo`; login `secretaria@escola.com/demo123` (tem `aluno:*`, `turma:*`, `matricula:*`).
2. Criar aluno em `/alunos/novo` → editar → excluir → some da lista mas permanece no BD (`excluidoEm` setado).
3. Matricular em `/matriculas` → conferir `vagasOcupadas` na turma, atividade no dashboard e sino de notificação do aluno.
4. Como `aluno@escola.com/demo123`: `/portal/aluno/rematricula` → solicitar; como admin: `/rematriculas` → aprovar → matrícula criada.
5. `curl -b <cookie> localhost:3000/api/turmas/1/alunos` — lista alunos da turma.
