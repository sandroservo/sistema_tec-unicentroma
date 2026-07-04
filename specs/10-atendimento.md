# 10 — Atendimento (requerimentos, certificados, PDFs, documentos, ViaCEP)

## Escopo
Requerimentos/protocolos (aluno abre → secretaria atende → notifica), certificados com código único, geração de PDFs acadêmicos server-side (@react-pdf/renderer), upload/download de documentos digitalizados em storage local e proxy ViaCEP.

## Models (Prisma)
- `Requerimento` — alunoId, `protocolo` unique (`REQ-2026-000123`), tipo (`declaracao_matricula|historico|declaracao_conclusao|segunda_via_boletim|revisao_nota|outro`), descricao?, status (`aberto|em_andamento|concluido|indeferido`), resposta?, atendidoPorUserId?, atualizadoEm.
- `Certificado` — alunoId, cursoId, turmaId?, matriculaId?, dataEmissao, cargaHoraria, `codigo` unique.
- `Documento` — id cuid, nome (original), tipo (rg/cpf/contrato/foto/comprovante...), path (relativo no storage), mime, tamanho, `donoTipo` ("Aluno"|"Professor"|"Funcionario"), donoId, uploadedById?. Índice `[donoTipo,donoId]`.

## API
### Requerimentos
| Rota | Permissão | Comportamento |
|---|---|---|
| GET `/api/portal/aluno/requerimentos` | `requireAluno` | lista os do próprio aluno, desc por criadoEm |
| POST `/api/portal/aluno/requerimentos` | `requireAluno` | zod (tipo do enum, descricao ≤2000); **protocolo `REQ-{ano}-{6 dígitos aleatórios}` com até 5 retries em colisão P2002** (unique); status inicial `aberto`; audit; 201 |
| GET `/api/requerimentos` | `requerimento:ler` | filtros `status`, `alunoId`; inclui `alunoNome` |
| GET `/api/requerimentos/[id]` | `requerimento:ler` | detalhe |
| PATCH `/api/requerimentos/[id]` | `requerimento:atender` | zod (status do enum, resposta ≤4000); grava `atendidoPorUserId`; audit; **notifica o aluno** via `createNotificacao` (tipo sucesso/erro/info conforme status, link `/portal/aluno/requerimentos`) — só se existir User vinculado ao aluno |

Fluxo: aluno abre no portal → secretaria/coordenação filtra por status em `(app)/requerimentos`, responde e muda status → aluno vê resposta + notificação. `requerimento:atender` é coberto por `requerimento:*` (coordenador, secretaria) e `*` (super_admin, diretor).

### Certificados (contrato legado, via `certificadoDTO`)
| Rota | Permissão | Comportamento |
|---|---|---|
| GET `/api/certificados` | `certificado:ler` | filtro `alunoId`; inclui alunoNome/cursoNome |
| POST `/api/certificados` | `certificado:criar` | gera `codigo = CERT-{ano}-{8 hex maiúsculos}` (`randomBytes(4)`); cria registro de `Atividade` tipo `certificado`; audit; 201. **Sem zod** (body cru) |
| GET `/api/certificados/[id]` | `certificado:ler` | detalhe |

### PDFs (`@react-pdf/renderer` server-side, `runtime nodejs`, route.tsx; templates em `src/lib/pdf/{boletim,declaracao,historico}.tsx` + `media.ts` + `styles.ts`)
| Rota | Permissão | Comportamento |
|---|---|---|
| GET `/api/pdf/boletim/[alunoId]?turmaId=` | `aluno:ler` | turma da query ou matrícula mais recente; médias ponderadas por disciplina (`lib/pdf/media.ts`); `Content-Disposition: inline` |
| GET `/api/pdf/declaracao/[alunoId]` | `aluno:ler` | declaração de matrícula com data por extenso pt-BR |
| GET `/api/pdf/historico/[alunoId]` | `aluno:ler` | todas as matrículas × disciplinas com média |

Dados faltantes viram `"—"` (curso/turma/matrícula/média nulos); boletim sem disciplinas imprime "Nenhuma disciplina encontrada". Botões no client: `AlunoPdfActions` (`src/components/aluno-pdf-actions.tsx`, `window.open`) — usado em `(app)/alunos/[id]` e `/portal/aluno/documentos`.

### Documentos (upload local)
| Rota | Permissão | Comportamento |
|---|---|---|
| GET `/api/documentos?donoTipo=&donoId=` | `permFor(donoTipo,"ler")` → `aluno:ler` etc. | lista do dono; 400 sem params ou donoTipo desconhecido |
| POST `/api/documentos` | `permFor(donoTipo,"editar")` | multipart; **máx 10MB**; MIME ∈ pdf/jpeg/png/webp; grava via `saveFile` e cria `Documento`; audit; 201 |
| GET `/api/documentos/[id]` | `permFor(doc.donoTipo,"ler")` | **download via handler autenticado** — lê do storage e responde com o MIME + `inline; filename=` (arquivo nunca é servido estático) |
| DELETE `/api/documentos/[id]` | `permFor(doc.donoTipo,"editar")` | apaga arquivo + registro; audit; 204 |

Permissão herdada do dono (`src/lib/documentos.ts`: Aluno→`aluno`, Professor→`professor`, Funcionario→`funcionario`). Storage (`src/lib/storage.ts`): `UPLOAD_DIR` (default `./uploads`), subpasta `ano/mes`, nome `randomUUID+ext`, `resolveSafe` **bloqueia path traversal** (resolve dentro do base ou lança). UI: `DocumentosCard` (`src/components/documentos-card.tsx`) — upload+tabela+download+delete, usado em `(app)/alunos/[id]`.

### ViaCEP
| Rota | Permissão | Comportamento |
|---|---|---|
| GET `/api/cep/[cep]` | autenticado (`currentUser`) | normaliza para 8 dígitos (400), proxy `viacep.com.br` (502 em falha, 404 se `erro`); devolve `{cep,logradouro,bairro,cidade,estado}`. Client helper: `src/lib/cep.ts` |

## Telas
`(app)/requerimentos` (tabela com filtro por status, dialog de atendimento; tipos com rótulos PT) · `/portal/aluno/requerimentos` (form de abertura + tabela, mesmos rótulos) · `(app)/certificados` (lista + emissão) · `/portal/aluno/documentos` (só `AlunoPdfActions`) · `(app)/alunos/[id]` (`AlunoPdfActions` + `DocumentosCard`).

## Regras de negócio
- Protocolo e código de certificado são gerados no servidor, únicos por constraint; colisão de protocolo é tratada por retry (P2002), certificado confia na entropia (4 bytes hex).
- Requerimento nunca é editado pelo aluno após aberto — só a secretaria muda status/resposta.
- PDFs são gerados on-the-fly (nada persistido em disco).
- Download de documento sempre passa pelo handler (RBAC + anti-traversal); não há rota pública de uploads.

## Débitos
- **PDFs exigem `aluno:ler`, mas o papel `aluno` só tem `portal:aluno`** → os botões de `/portal/aluno/documentos` retornam 403 para o próprio aluno (funcionam para admin/secretaria em `(app)/alunos/[id]`).
- Pelo mesmo motivo, aluno não consegue listar/baixar os próprios `Documento`s (permissão herdada do dono é admin-only); `DocumentosCard` só existe no admin.
- POST `/api/certificados` sem validação zod; certificado não tem PDF (só registro + código — verificação pública do código também não existe).
- Tipos de requerimento como "declaração de matrícula" não geram o PDF automaticamente ao concluir — atendimento é manual.
- Rótulos PT dos tipos estão duplicados em duas páginas (admin e portal), não centralizados.

## Como testar
1. Login aluno → `/portal/aluno/requerimentos` → abrir "Histórico" → recebe protocolo `REQ-...`.
2. Login secretaria → `(app)/requerimentos` → concluir com resposta → aluno recebe notificação (sino) e vê resposta.
3. POST `/api/certificados` (admin) → `codigo` `CERT-YYYY-XXXXXXXX`; registro em Atividade.
4. Admin em `(app)/alunos/[id]`: gerar boletim/declaração/histórico (PDF inline); subir PDF de 11MB → 400; `GET /api/documentos/[id]` deslogado → 401.
5. GET `/api/cep/01001000` logado → dados do ViaCEP; `abc` → 400.
