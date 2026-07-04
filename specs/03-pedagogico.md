# 03 — Pedagógico

## Escopo
Diário eletrônico (aulas + chamada), frequência com % e risco, notas legadas (nota1..3/final), avaliações com peso e lançamentos (média ponderada), ocorrências disciplinares e plano de ensino.

## Models (Prisma)
| Model | Campos-chave | Particularidades |
|---|---|---|
| `Aula` | turmaId (Cascade), disciplinaId, `data @db.Date`, conteudo, observacoes | `@@index([turmaId, data])`; apagar aula apaga presenças (cascade) |
| `Presenca` | aulaId (Cascade), alunoId, status (presente\|falta\|atraso\|justificada, default presente), justificativa | `@@unique([aulaId, alunoId])` → base do upsert |
| `Nota` (legada) | alunoId, turmaId, disciplinaId, `nota1..nota3, notaFinal, media Decimal(4,2)`, situacao (default "em_curso") | Contrato herdado do Express; media/situacao persistidas |
| `Avaliacao` | turmaId (Cascade), disciplinaId, tipo (prova\|trabalho\|seminario\|atividade\|pratica\|recuperacao\|segunda_chamada), `peso Decimal(4,2) @default(1)`, `data? @db.Date` | `@@index([turmaId, disciplinaId])` |
| `LancamentoNota` | avaliacaoId (Cascade), alunoId, `valor Decimal(4,2)?` | `@@unique([avaliacaoId, alunoId])`; valor null = não lançado |
| `Ocorrencia` | alunoId, tipo (advertencia\|elogio\|observacao\|suspensao), gravidade (baixa\|media\|alta, default media), descricao, `data @db.Date`, registradoPorUserId? | registradoPorUserId é string solta (sem relation/FK) |
| `PlanoEnsino` | `disciplinaId @unique` (1:1, Cascade), ementa, conteudoProgramatico, competencias, metodologia, bibliografia, criterioAvaliacao | `atualizadoEm @updatedAt` |

## API
| Rota | Permissão | Comportamento |
|---|---|---|
| `GET/POST /api/aulas` | `aula:ler` / `aula:criar` | Filtros turmaId/disciplinaId/data; POST zod, flatten turmaNome/disciplinaNome |
| `GET/PATCH/DELETE /api/aulas/[id]` | `aula:ler/editar/excluir` | GET inclui presenças com nome do aluno; DELETE hard (presenças caem por cascade) |
| `GET /api/aulas/[id]/presencas` | `frequencia:ler` | Merge: matrículas **ativas** da turma × presenças da aula; sem registro → default `"presente"` |
| `PUT /api/aulas/[id]/presencas` | `frequencia:lancar` | Array `{alunoId,status,justificativa?}`; tx de **upserts** por `aulaId_alunoId` (idempotente). Audita `presenca:update` |
| `GET /api/turmas/[id]/frequencia` | `frequencia:ler` | Por aluno (matrículas ativas): totalAulas, presencas, faltas, `percentual` (1 casa), `risco = percentual < 75` |
| `GET/POST /api/notas` | `nota:ler` / `nota:lancar` | Legadas: filtros alunoId/turmaId/disciplinaId; POST calcula media+situacao no server e persiste |
| `PATCH/DELETE /api/notas/[id]` | `nota:lancar` | PATCH mescla com valores existentes e **recalcula** media/situacao; DELETE hard |
| `GET/POST /api/avaliacoes` | `nota:ler` / `nota:lancar` | Filtros turmaId/disciplinaId; POST zod (peso positivo, default 1); `peso` retorna como number |
| `GET/PATCH/DELETE /api/avaliacoes/[id]` | `nota:ler` / `nota:lancar` | DELETE remove lançamentos por cascade |
| `GET/PUT /api/avaliacoes/[id]/lancamentos` | `nota:ler` / `nota:lancar` | GET: matrículas ativas × lançamentos (valor null se não lançado). PUT: array `{alunoId, valor|null}`, tx de upserts |
| `GET /api/turmas/[id]/medias` | `nota:ler` | Média ponderada por (aluno, disciplina) das avaliações da turma (opcional `?disciplinaId=`); inclui alunos sem lançamento (media null / "em_curso") |
| `GET/POST /api/ocorrencias` | `ocorrencia:ler` / `ocorrencia:registrar` | Filtros alunoId/tipo; POST grava `registradoPorUserId` do usuário logado |
| `GET/PATCH/DELETE /api/ocorrencias/[id]` | `ocorrencia:ler` / `ocorrencia:registrar` | PATCH/DELETE usam a mesma perm `registrar` |
| `GET/PUT /api/disciplinas/[id]/plano` | `planoensino:ler` / `planoensino:editar` | GET pode retornar null; PUT = **upsert** por disciplinaId (P2003 → 404 disciplina inexistente) |
| Portais | `requireAluno`/`requireResponsavel` | `GET /api/portal/aluno/ocorrencias` e `GET /api/portal/responsavel/aluno/[id]` expõem ocorrências; notas do portal vêm de `mediasPorDisciplina` (`api/portal/aluno/_media.ts`) |

## Telas
| Rota | O que faz |
|---|---|
| `/diario`, `/diario/novo`, `/diario/[id]` | Lista de aulas, registro de aula (turma/disciplina/data/conteúdo), detalhe com **chamada** (GET/PUT presencas) |
| `/frequencia` | Seleciona turma → tabela `GET /api/turmas/[id]/frequencia` com badge de risco |
| `/notas` | Lista notas legadas (client orval `useListNotas`) |
| `/avaliacoes`, `/avaliacoes/novo`, `/avaliacoes/[id]` | Lista/criação de avaliações; detalhe = grade de lançamentos por aluno (PUT em lote) |
| `/ocorrencias` | Lista + registro/edição de ocorrências |
| `/disciplinas/[id]/plano` | Form do plano de ensino (upsert) |
| Portais | `/portal/aluno` (notas = médias ponderadas, frequência, ocorrências), `/portal/responsavel` (por filho), `/portal/professor` (turmas escopadas via `_scope.ts`) |

## Regras de negócio
- **Frequência**: `presente`, `atraso` e `justificada` contam como presença; só `falta` reduz (`PRESENTE` set em `turmas/[id]/frequencia`). `percentual = pres/totalAulas` (arredondado a 1 casa); turma sem aulas → 100%. Risco = `< 75%`.
- **Notas legadas** (`src/lib/notas.ts`, porte fiel do Express): `calcularMedia` = média **aritmética simples apenas das notas preenchidas** (nota1..3 + notaFinal); `calcularSituacao`: null→`em_curso`, ≥6→`aprovado`, ≥4→`recuperacao`, senão `reprovado`. Sempre recalculadas no server (POST/PATCH), nunca confiadas ao client.
- **Avaliações**: média ponderada `Σ(valor·peso)/Σ(peso)` só sobre lançamentos com `valor ≠ null`; mesmos cortes 6/4 para situação. Duplicada em `api/turmas/[id]/medias` (por turma, admin) e `api/portal/aluno/_media.ts` (por aluno, portais — labels "Aprovado/Recuperação/Reprovado/Cursando").
- Chamada e lançamentos são PUT em lote idempotentes (upsert pela unique composta) dentro de `$transaction`.
- Plano de ensino é 1:1 com disciplina; criado sob demanda no primeiro PUT.
- Todas as escritas auditam (`logAudit`).

## Débitos
- `GET /api/turmas/[id]/medias` **não tem consumidor na UI admin** (só portais usam a variante `_media.ts`); não há tela de boletim consolidado por turma.
- Duas fontes de nota coexistem: `Nota` legada (tela `/notas`, PDFs) e Avaliacao/LancamentoNota (portais). Não se comunicam — portal ignora notas legadas.
- Aluno sem chamada lançada tem 0 registros → percentual 0% (aparece em risco mesmo sem chamada feita); default "presente" só existe no GET de presenças, não vira registro.
- ~~Rotas admin de aula/nota/avaliação não são escopadas por professor (professor com `aula:*`/`nota:lancar` edita aula/nota de qualquer turma; escopo só existe no portal professor via `api/portal/professor/_scope.ts`).~~ CORRIGIDO: `assertProfessorTurma` (`src/lib/professorScope.ts`, reusa `turmasWhere` do `_scope.ts`) aplicado após o guard de permissão nas mutações de aulas, presenças, avaliações, lançamentos e notas — papel "professor" só muta turmas do seu escopo (403 fora dele); GETs e demais papéis inalterados.
- `PATCH /api/notas/[id]` não permite **limpar** uma nota (null mantém valor existente).
- `Ocorrencia.registradoPorUserId` sem FK/relation; não exposto nas listagens.
- TODOs de sidebar (comentários nos pages): Diário, Frequência e Avaliações sem link no app-sidebar.
- Sem validação de nota máxima (valor ≤ 10) nos lançamentos/notas.

## Como testar
1. `npm run db:seed:demo`; login `coordenacao@escola.com/demo123` (aula/frequencia/nota/ocorrencia `*`) ou `professor@escola.com/demo123`.
2. Diário: `/diario/novo` (turma+disciplina+conteúdo) → `/diario/[id]` → lançar chamada (marcar faltas) → salvar → repetir salvar (idempotente).
3. `/frequencia` → escolher a turma → % e risco refletem a chamada (atraso/justificada não derrubam o %).
4. Avaliações: criar prova peso 2 + trabalho peso 1 em `/avaliacoes/novo`; lançar valores em `/avaliacoes/[id]`; conferir média ponderada: `curl -b <cookie> "localhost:3000/api/turmas/<id>/medias"`.
5. Portal: `aluno@escola.com/demo123` → notas do portal batem com Σ(valor·peso)/Σ(peso).
6. Plano: `/disciplinas/[id]/plano` → salvar → GET `api/disciplinas/[id]/plano` retorna o upsert.
