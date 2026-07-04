# 01 — Auth & RBAC

## Escopo
Login por identificador (CPF/e-mail/matrícula), MFA TOTP em duas fases, reset de senha, Google OAuth env-gated, matriz RBAC, gestão de usuários, auditoria, rate-limit e middleware de proteção/redirect.

## Models (Prisma)
| Model | Campos-chave | Particularidades |
|---|---|---|
| `User` | id cuid, nome, `email @unique`, `cpf? @unique`, `matricula? @unique`, senhaHash, `papel` (string, default "secretaria"), ativo, mfaSecret?, mfaEnabled, `recoveryCodes String[]` (hashes bcrypt) | Vínculos 1:1 opcionais e `@unique`: `alunoId`, `professorId`, `responsavelId` → escopo dos portais |
| `PasswordResetToken` | userId, `token @unique`, expiresAt, `usado` | Uso único, expira em 1h; sem relation com User (só index userId) |
| `AuditLog` | userId? (FK `onDelete: SetNull`), acao ("aluno:create"), recurso, recursoId?, `antes/depois Json?`, ip | Index em `[recurso,recursoId]` e `[userId]` |
| `Session` | userId, `sessionToken @unique`, userAgent, ip, expiresAt | **Sem fluxo** — JWT stateless; existe p/ futuro "sair de todos" |

## API
| Rota | Permissão | Comportamento |
|---|---|---|
| `POST /api/auth/mfa-check` | pública (rate-limit 10/60s por IP) | Fase 1 do login: valida senha e retorna `{ok, mfaRequired}`. Só revela `mfaRequired` após senha correta; senha errada → `{ok:false}` **200** (não vaza existência) |
| `POST/GET /api/auth/[...nextauth]` | pública | Auth.js: Credentials (identificador+senha+codigo) e Google (se env) |
| `POST /api/auth/reset` | pública (sem rate-limit) | Cria token (1h) e envia link `/redefinir-senha?token=` via `enviarEmail` (sem SMTP → console.log). **Sempre 200 {ok:true}** |
| `POST /api/auth/reset/confirm` | pública | Valida token (não usado, não expirado), tx: atualiza senhaHash (bcrypt 10) + marca `usado` |
| `GET /api/mfa/setup` | autenticado | Gera secret candidato + `otpauth://` + QR data-URL. **Não persiste** |
| `POST /api/mfa/enable` | autenticado | Valida TOTP contra o secret candidato; salva secret + `mfaEnabled` + 8 recovery codes (retorna planos **uma vez**). Audita `mfa:enable` |
| `POST /api/mfa/disable` | autenticado | Exige TOTP ou recovery code válido; zera secret/codes. Audita `mfa:disable` |
| `GET/POST /api/usuarios` | `usuario:gerenciar` | Lista (search em nome/email/cpf/matricula) / cria (zod, papel ∈ ROLES, senha min 6, aceita alunoId/professorId). `publicSelect` nunca expõe senhaHash. P2002 → 409 |
| `GET/PATCH/DELETE /api/usuarios/[id]` | `usuario:gerenciar` | PATCH parcial (troca senha se enviada); DELETE é **hard delete** |

## Fluxos
- **Login two-phase** (`src/app/login/page.tsx`): submit → `mfa-check`; se `mfaRequired` mostra campo código e re-submete; senão `signIn("credentials")` direto. `authorize` em `src/auth.ts`: resolve identificador (`whereFromIdentificador` em `src/lib/identify.ts` — contém `@` → email lowercase; 11 dígitos → cpf; senão matrícula), exige `ativo`, bcrypt, e se `mfaEnabled`: TOTP (`otplib` v12, drift ±1) ou recovery code (consumido do array no match).
- **Google OAuth**: provider só registrado se `AUTH_GOOGLE_ID`+`AUTH_GOOGLE_SECRET`. `signIn` callback: só e-mail já cadastrado e ativo (sem auto-provisionamento). Login page detecta via `/api/auth/providers`. Callback `jwt` faz lookup no BD p/ carregar id/papel.
- **JWT**: `auth.config.ts` é edge-safe (sem Prisma/bcrypt, usado pelo middleware); token/session carregam `id` + `papel`.
- **Reset**: `/esqueci-senha` (form identificador) → `/redefinir-senha?token=` (nova senha).

## RBAC (`src/lib/rbac.ts`)
Matriz **em código** (comentário ponytail: papéis fixos), formato `recurso:acao`, curingas `*` e `recurso:*`. Guards: `requirePermission(perm)` → `{user}` ou NextResponse 401/403 (`src/lib/authz.ts`); `can(perm)` em server components; portais usam `requireAluno/Professor/Responsavel` (`src/lib/portal.ts`).

11 papéis:
| Papel | Grants |
|---|---|
| `super_admin`, `diretor` | `*` (tudo — únicos com `usuario:gerenciar`) |
| `coordenador` | dashboard:ler + `*` de: aluno, professor, curso, turma, disciplina, matricula, nota, certificado, sala, calendario, aula, frequencia, planoensino, ead, selecao, comunicacao, requerimento, ocorrencia, aviso + relatorio:ler |
| `secretaria` | dashboard:ler; `*` de: aluno, turma, matricula, certificado, sala, calendario, selecao, comunicacao, requerimento, ocorrencia, aviso; **ler apenas**: professor, curso, disciplina, planoensino; relatorio:ler |
| `financeiro` | dashboard:ler, aluno:ler, `cobranca:*`, `despesa:*`, relatorio:ler |
| `rh` | dashboard:ler, `professor:*`, `funcionario:*` |
| `professor` | dashboard:ler; turma/disciplina/aluno/sala/calendario:ler; nota:ler+lancar; aula ler/criar/editar/excluir; frequencia ler/lancar; planoensino ler/editar; ead ler/criar/editar/excluir/corrigir; ocorrencia ler/registrar |
| `bibliotecario` | dashboard:ler, `biblioteca:*`, aluno:ler |
| `aluno` / `responsavel` / `candidato` | só `portal:aluno` / `portal:responsavel` / `portal:candidato` |

## Telas
| Rota | O que faz |
|---|---|
| `/login` | Split-screen; identificador+senha, campo código MFA condicional, botão Google condicional, link inscrição |
| `/esqueci-senha`, `/redefinir-senha` | Públicas; solicitação e confirmação do reset |
| `/conta/seguranca` | Server component → `MfaCard` (`src/components/mfa-card.tsx`): ativar (QR+código, exibe recovery codes 1x) / desativar (código) |
| `/usuarios` | Lista com search + excluir (confirm) |
| `/usuarios/novo` | Form zod; campos alunoId/professorId aparecem conforme papel selecionado |

## Regras de negócio
- **Middleware** (`src/middleware.ts`, edge): públicas = `/login`, `/esqueci-senha`, `/redefinir-senha`, `/inscricao`, `/api/inscricao` (+ `api/auth` e estáticos via matcher). Não logado → `/login`. Logado em `/login` → `/`. Landing por papel (só páginas, não `/api`): aluno→`/portal/aluno`, professor→`/portal/professor`, responsavel→`/portal/responsavel`; papéis administrativos são expulsos de `/portal/*` → `/`.
- **Auditoria** (`src/lib/audit.ts`): `logAudit` best-effort (nunca lança), captura userId da sessão + IP de `x-forwarded-for`/`x-real-ip`, grava antes/depois JSON. Chamado em ~80 route handlers de escrita.
- **Rate-limit** (`src/lib/ratelimit.ts`): janela deslizante **em memória por instância**; aplicado apenas em `mfa-check` (10/60s) e `POST /api/inscricao` (5/60s). 429 com `Retry-After`.
- Login e Google exigem `user.ativo`; identificador nunca diferencia "não existe" de "senha errada".

## Débitos
- `usuario:gerenciar` não está em nenhuma matriz explícita — só `super_admin`/`diretor` via `*`.
- API de usuários não aceita `responsavelId` (create/update); vínculo responsável só via `POST /api/responsaveis`.
- Sem página de edição de usuário (`/usuarios/[id]` não existe); TODO no topo de `usuarios/page.tsx`: falta link no app-sidebar.
- `DELETE /api/usuarios/[id]` é hard delete (sem soft-delete/inativação forçada).
- Reset: sem rate-limit; tokens antigos não são invalidados ao gerar novo nem ao usar um.
- Model `Session` sem fluxo (JWT stateless — revoke real de sessões pendente, ver 00).
- "Manter conectado" no login é decorativo (não altera maxAge do JWT).
- Rate-limit por instância (comentário ponytail: Redis/DB se escalar horizontal).

## Como testar
1. `npm run db:seed:demo` → logins: `admin@escola.com/admin123` (super_admin), `secretaria@escola.com`, `financeiro@escola.com`, `coordenacao@escola.com`, `aluno@escola.com`, `professor@escola.com` (todos `demo123`).
2. Login com CPF do aluno demo também funciona (mesma senha).
3. MFA: logado, `/conta/seguranca` → ativar com app autenticador → logout → login pede código após senha correta.
4. Reset sem SMTP: `curl -X POST localhost:3000/api/auth/reset -d '{"identificador":"admin@escola.com"}' -H 'content-type: application/json'` → link no console do server.
5. RBAC: logar como `financeiro@escola.com` e tentar `GET /api/usuarios` → 403.
