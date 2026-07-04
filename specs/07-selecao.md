# 07 — Processo Seletivo

## Escopo
Gestão de processos seletivos (admin) + inscrição pública sem login + resultado (nota/classificação/status) + matrícula automática do convocado (cria/reusa Aluno).

## Models (Prisma)
- **ProcessoSeletivo** — nome, descricao?, `vagas` (default 0), `inscricaoInicio`/`inscricaoFim` (@db.Date), `dataProva?`, `taxaInscricao` Decimal(10,2) default 0, `status` (`aberto|encerrado|resultado`).
- **Inscricao** — processoId (cascade), nome, cpf, email, telefone?, `cursoPretendidoId?`, `isento`, `pagamentoStatus` (`pendente|pago|isento`), `nota?` Decimal(5,2), `classificacao?`, `status` (`inscrito|aprovado|reprovado|convocado|matriculado`), `alunoId?` (preenchido na matrícula automática). Índice `[processoId, status]`.

## API
| Rota | Permissão | Comportamento |
|---|---|---|
| GET/POST `/api/selecao` | `selecao:ler` / `selecao:criar` | Lista processos (com `totalInscricoes`) / cria (datas via `toDate`, DTO serializa datas e taxa). Audita. |
| GET/PATCH/DELETE `/api/selecao/[id]` | `selecao:ler`/`selecao:editar`/`selecao:excluir` | GET inclui inscrições ordenadas por classificação/nome. PATCH parcial (inclui `status`). |
| GET `/api/selecao/[id]/inscricoes` | `selecao:ler` | Inscrições do processo ordenadas por classificação, nome. |
| PATCH `/api/selecao/inscricoes/[inscricaoId]` | `selecao:convocar` | Atualiza `nota`, `classificacao`, `status`, `pagamentoStatus` (setar `isento` sincroniza flag `isento=true`). Audita. |
| POST `/api/selecao/inscricoes/[inscricaoId]/matricular` | `selecao:convocar` | Matrícula automática em `$transaction`: exige status `convocado` ou `aprovado` (409 senão); se `alunoId` já preenchido, idempotente (`already`). Reusa Aluno existente por `cpf` OU `email`; senão cria (`status: "ativo"`) tratando corrida **P2002** re-buscando. Atualiza inscrição → `alunoId` + status `matriculado`. Audita. |
| GET `/api/inscricao/processos` | **público** | Só processos `aberto` e dentro do período (`inscricaoInicio<=hoje<=inscricaoFim`); nunca expõe inscritos. |
| POST `/api/inscricao` | **público** | **Rate-limit 5/min por IP** (429 + `Retry-After`, `lib/ratelimit`). Valida Zod (cpf min 11, email) e prazo/status `aberto` do processo (400). Cria inscrição `inscrito`/`pendente` e responde comprovante `{protocolo: id, nome, processo}`. |

Rotas públicas liberadas no `src/middleware.ts` via `PUBLIC_PREFIXES = [... "/inscricao", "/api/inscricao"]`.

## Telas
- `/(app)/selecao` — lista de processos ("Processo Seletivo").
- `/(app)/selecao/novo` — formulário de novo processo.
- `/(app)/selecao/[id]` — detalhe: tabela de inscrições, lançar nota/classificação, mudar status/pagamento, botão matricular.
- `/inscricao` — página pública (fora do shell autenticado, estilo inline próprio): lista processos abertos, formulário de inscrição e tela de **comprovante com protocolo** após envio.

## Regras de negócio
- Inscrição pública só com processo `aberto` E dentro da janela de datas — checagem server-side, não confia no front.
- Protocolo do comprovante = `Inscricao.id`.
- Matrícula automática não cria Matricula em turma — cria/vincula **Aluno**; a matrícula em turma é feita depois no módulo acadêmico.
- `pagamentoStatus=isento` no PATCH também seta `isento=true`.
- Rate-limit é em memória, por instância (débito global de arquitetura).

## Débitos
- **Pagamento da taxa de inscrição não implementado** (TODO no código; `taxaInscricao` só informativo, `pagamentoStatus` manual).
- **Upload de documentos do candidato não implementado** (TODO no código).
- Sem página pública de consulta de resultado por protocolo/CPF; candidato não tem portal (papel `candidato` existe no RBAC com `portal:candidato`, sem uso).
- Classificação é lançada manualmente (sem ranking automático por nota).

## Como testar
1. Admin: criar processo em `/selecao/novo` com janela incluindo hoje, status `aberto`.
2. Deslogado: `/inscricao` → inscrever-se → conferir comprovante com protocolo; repetir 6x rápido → 429.
3. `PATCH /api/selecao/inscricoes/[id]` com `{status:"convocado", nota, classificacao}`; depois `POST .../matricular` → aluno criado (ou reusado se CPF/email já existe em Alunos) e status `matriculado`; repetir POST → idempotente.
4. Fechar o processo (`status: encerrado`) → POST público volta 400.
