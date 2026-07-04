# 05 — Portais (aluno, professor, responsável)

## Escopo
Portais self-service com layout próprio (`src/app/portal/*`, sem sidebar admin) e APIs escopadas por vínculo (`src/app/api/portal/*`). **Landing por papel no middleware** (`src/middleware.ts`): logado navegando em página (não `/api`), `aluno` → `/portal/aluno`, `professor` → `/portal/professor`, `responsavel` → `/portal/responsavel`; papéis administrativos que tentarem `/portal/*` voltam para `/`.

## Models (Prisma)
Sem models próprios — os portais leem models dos outros módulos. Vínculo conta↔pessoa vem de `User.alunoId/professorId/responsavelId`; `Responsavel` tem m2m `alunos` (um responsável acompanha vários filhos).

## Segurança (`src/lib/portal.ts`)
- `requireAluno()/requireProfessor()/requireResponsavel()` — 401 sem sessão, 403 se a conta não tem vínculo; devolvem `{alunoId}` / `{professorId}` / `{responsavelId, alunoIds}` **derivados do User logado — nunca de id vindo do client**.
- Layouts (server components) revalidam: sem sessão → `/login`; papel errado → `/`.
- RBAC: papéis `aluno`/`responsavel` só têm `portal:aluno`/`portal:responsavel`; `professor` tem permissões admin limitadas (aula:\*, frequencia:lancar, nota:lancar/ler, ead:\* etc.) que sustentam a reutilização de APIs admin no portal.

## API
### Portal do ALUNO (`/api/portal/aluno/*`, tudo `requireAluno`)
| Rota | Comportamento |
|---|---|
| GET `me` | `{alunoId, nome, matriculasAtivas}` |
| GET `resumo` | mediaGeral (média das médias por disciplina), frequenciaGeral %, saldoDevedor (cobranças ≠ pago), matriculasAtivas, próximos 5 eventos do calendário |
| GET `notas` | `mediasPorDisciplina` (`_media.ts`): **média ponderada Σ(valor·peso)/Σ(peso)** sobre lançamentos com valor≠null das avaliações das turmas com matrícula ativa; situação: ≥6 Aprovado, ≥4 Recuperação, <4 Reprovado, sem média Cursando |
| GET `frequencia` | % por turma/disciplina; `presente|atraso|justificada` contam presença, `falta` reduz; **`risco: percentual < 75`** |
| GET `financeiro` | cobranças legadas do aluno (descricao, valor, vencimento, status) |
| GET `grade` | disciplinas dos cursos das turmas matriculadas, ordenadas por período |
| GET `calendario` | eventos futuros (dataInicio ≥ hoje) |
| GET `ead/cursos` | cursos matriculados que têm `ModuloEad`, com % de progresso |
| GET `ead/curso/[cursoId]` | módulos+aulas+progresso; **403 se o curso não está entre as matrículas ativas** |
| PUT `ead/progresso` | `{aulaId, concluido}`; valida que a aula pertence a curso matriculado (403) |
| GET/POST `requerimentos` | ver spec 10 (aluno abre requerimento) |
| GET `ocorrencias` | ocorrências do aluno (tipo, gravidade, descricao, data) |
| GET/POST `rematricula` | GET: solicitações + turmas `planejada|em_andamento` com vaga; POST: valida turma existe/tem vaga, **409 se já há solicitação `solicitada` para a turma**, cria `Rematricula` status `solicitada` |

### Portal do PROFESSOR (`/api/portal/professor/*`, tudo `requireProfessor`, `runtime nodejs`)
Escopo em `_scope.ts` → `turmasWhere(professorId)`: turma com **`professorId` direto OU `cursoId` entre os cursos das disciplinas do professor**.
| Rota | Comportamento |
|---|---|
| GET `me` | `{professorId, nome, totalTurmas}` (count no escopo) |
| GET `turmas` | turmas do escopo com cursoNome, totalAlunos (matrículas ativas), status |
| GET `turma/[id]` | **valida posse** (`findFirst({id, ...turmasWhere})` → 403 "Turma não encontrada" se fora do escopo); devolve turma, alunos ativos e disciplinas do curso que são do professor (fallback: todas do curso se ele não tem nenhuma) |

### Portal do RESPONSÁVEL (`/api/portal/responsavel/*`, tudo `requireResponsavel`)
| Rota | Comportamento |
|---|---|
| GET `me` | `{responsavelId, nome, alunos:[{id,nome}]}` (filhos vinculados) |
| GET `aluno/[id]` | agregado read-only: notas (`mediasPorDisciplina`), frequência (mesma regra do aluno, risco <75%), financeiro (cobranças), ocorrências, requerimentos. **VALIDAÇÃO: `alunoId ∈ guard.alunoIds` senão 403** |

## Telas
- **Aluno** (`src/app/portal/aluno/*`, layout com header + NAV horizontal): Início (resumo), Notas, Frequência, Financeiro, Grade, Calendário, **Documentos** (usa `AlunoPdfActions` — boletim/declaração/histórico), Requerimentos (form + tabela com rótulos PT), Ocorrências, Rematrícula. Páginas EAD existem (`/portal/aluno/ead`, `/ead/[cursoId]`) **mas não estão na NAV**.
- **Professor** (`src/app/portal/professor/*`): NAV só Início + Minhas Turmas. `turma/[id]` com **Tabs Alunos / Chamada-Diário / Avaliações-Notas** que **reutilizam APIs admin** (`/api/aulas`, `/api/aulas/[id]/presencas`, `/api/avaliacoes`, `/api/avaliacoes/[id]/lancamentos`) — o papel professor tem essas permissões na matriz RBAC.
- **Responsável** (`src/app/portal/responsavel/*`): home com cards dos filhos (`/me`) → `aluno/[id]` com **Tabs read-only** Notas / Frequência / Financeiro / Ocorrências / Requerimentos.
- Todos os layouts têm `NotificationBell`, nome do usuário e sign-out; conta sem vínculo vê aviso "conta não vinculada".

## Regras de negócio
- Escopo sempre server-side a partir do vínculo do User; ids do client só são aceitos após validação de posse (turma do professor, filho do responsável, curso do aluno no EAD).
- Middleware só faz landing de **páginas**; a proteção das APIs é dos guards.
- Notas do portal usam Avaliações com peso (Fase 3), não as notas legadas.

## Débitos
- EAD do aluno fora da NAV (acesso só por URL direta).
- Financeiro do aluno/responsável mostra apenas `Cobranca` legada — Parcelas de Contrato não aparecem nos portais.
- Botões de PDF do portal do aluno chamam `/api/pdf/*` que exige `aluno:ler` — o papel `aluno` (só `portal:aluno`) recebe **403** (ver spec 10).
- APIs admin reutilizadas pelo professor são gated por permissão mas **não por posse**: professor autenticado pode, via API direta, lançar aula/presença/nota em turma fora do seu escopo (só a UI restringe).
- Portais não têm página de perfil/troca de senha própria (`/conta` é do layout admin).

## Como testar
1. `npm run db:seed:demo`; logar com usuário aluno → middleware manda para `/portal/aluno`; tentar `/alunos` → volta ao portal.
2. GET `/api/portal/aluno/notas` sem vínculo → 403; com vínculo → médias ponderadas conferem com Σ(valor·peso)/Σ(peso).
3. Professor: GET `/api/portal/professor/turma/[id]` de turma alheia → 403; da própria → alunos+disciplinas; lançar chamada e nota pelas Tabs.
4. Responsável: GET `/api/portal/responsavel/aluno/[id]` com id de aluno não vinculado → 403 "Sem permissão para este aluno".
5. Rematrícula: POST duas vezes na mesma turma → segunda dá 409.
