# 00 — Arquitetura

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · TailwindCSS 4 · Shadcn/UI · TanStack Query · React Hook Form + Zod · Prisma 6 + PostgreSQL 16 · Auth.js v5 (JWT) · nodemailer · FullCalendar · Recharts · @react-pdf/renderer · qrcode · otplib v12 (NÃO v13 — API incompatível).

## Decisões estruturais
- **Monolito** Next: route handlers = backend. Sem multi-tenant (1 escola = 1 deploy). Sem Redis (fila futura = pg-boss). Uploads em disco local (`UPLOAD_DIR`, default `./uploads`). Realtime = SSE (socket.io deferido — exigiria custom server).
- **Client API híbrido**: módulos da Fase 0 (alunos/professores/cursos/turmas/disciplinas/matrículas/notas/financeiro-cobranças/certificados/dashboard) usam client gerado orval em `src/lib/api-client` (contrato herdado do Express legado — shapes achatados, `{data,total,page,limit}` em alunos). Módulos novos usam hooks TanStack Query locais + fetch.
- **Redirect por papel no middleware** (`src/middleware.ts`): aluno→/portal/aluno, professor→/portal/professor, responsavel→/portal/responsavel, admin fica em `/` e não acessa portais. Rotas públicas: `/login`, `/esqueci-senha`, `/redefinir-senha`, `/inscricao`, `/api/inscricao` + estáticos por extensão.

## Estrutura
```
src/
  app/(app)/         # admin autenticado (sidebar); páginas por módulo
  app/portal/{aluno,professor,responsavel}/  # portais com layout próprio
  app/inscricao/     # página pública (processo seletivo)
  app/api/           # route handlers (backend); api/portal/* escopados por vínculo
  components/ui/     # shadcn
  components/        # app-sidebar (nav agrupada), notification-bell, mural-widget, theme-toggle, logo-tec, mfa-card, documentos-card, aluno-pdf-actions
  lib/               # ver "Libs compartilhadas"
prisma/schema.prisma # todos os models (@map para snake_case)
prisma/seed.ts       # admin only | seed-demo.ts: dados completos (npm run db:seed:demo)
messages/pt-BR.json  # labels de nav/grupos (sistema pt-BR only)
specs/               # estas specs
```

## Libs compartilhadas (`src/lib`)
| Lib | Função |
|---|---|
| `prisma.ts` | singleton PrismaClient |
| `rbac.ts` | ROLES + matriz `recurso:acao` + `hasPermission` |
| `authz.ts` | `requirePermission` (handlers), `can` (server comp.), `currentUser` |
| `portal.ts` | `requireAluno/Professor/Responsavel` + `current*Id` (escopo dos portais) |
| `audit.ts` | `logAudit({acao,recurso,recursoId,antes,depois})` — best-effort |
| `serialize.ts` | `dateOnly`, `toDate`, `num`, `decStr` (contrato Decimal/Date) |
| `dto.ts` | serializadores dos módulos Fase 0 (contrato legado) |
| `financeiro.ts` | `gerarParcelas` (fecha total, clamp dia) + `descontoEfetivo`; self-check em `financeiro.check.ts` (`npx tsx src/lib/financeiro.check.ts`) |
| `notas.ts` | `calcularMedia`/`calcularSituacao` (notas legadas) |
| `notify.ts` | `createNotificacao`, `notificarAluno` |
| `email.ts` | `enviarEmail` env-gated (SMTP_*; sem env → console.log) |
| `ratelimit.ts` | janela deslizante em memória (`rateLimit`, `clientIp`) — por instância |
| `storage.ts` | uploads locais, anti path-traversal |
| `mfa.ts` | TOTP + recovery codes (otplib v12) |
| `identify.ts` | identificador de login → filtro User (email/CPF/matrícula) |
| `cep.ts` | `buscarCep` (client) → `/api/cep/[cep]` |
| `pdf/` | docs PDF (boletim, declaração, histórico) + `media.ts` |
| `integrations/` | evolution (WhatsApp), banco (PIX stub), assinatura (stub) |

## Auth (resumo; detalhe em 01)
JWT stateless. `auth.config.ts` = edge-safe (middleware); `auth.ts` = node (Credentials com identificador+senha+código MFA; Google env-gated sem auto-provisionamento). Token carrega `id`+`papel`.

## Infra
`docker-compose.yml`: Postgres 16 (volume pgdata) + app (volume uploads; boot roda db push+seed). `Dockerfile` node:22-slim (npm ci, sem standalone — mantém prisma CLI). `.env.example` documenta todas as envs (todas as integrações opcionais).

## Débitos globais
Revoke real de sessões (JWT stateless; model Session existe sem fluxo) · socket.io ao vivo · pg-boss ainda não instalado (comunicados enviam síncrono) · Nginx/CI/backup não configurados · rate-limit por instância (Redis/DB se escalar) · páginas de edição faltam em vários módulos Fase 0/2 (padrão pronto em alunos e cursos) · warning NFT benigno do storage no build.
