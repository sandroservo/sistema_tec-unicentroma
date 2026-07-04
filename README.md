# ERP Escola — Sistema de Gestão (Next.js 16)

Migração do app Vite/Express/Drizzle (`Educa-Hub/artifacts/escola-tecnica`) para um **monolito Next.js 16**.

## Stack

- **Next.js 16** (App Router) — front + back no mesmo projeto (Route Handlers em `src/app/api`).
- **TypeScript**, **TailwindCSS 4**, **Shadcn/UI** (componentes em `src/components/ui`).
- **TanStack Query** + **React Hook Form** + **Zod** (client de dados gerado reaproveitado em `src/lib/api-client`).
- **PostgreSQL** + **Prisma** (`prisma/schema.prisma`, mapeado às tabelas existentes).
- **Auth.js v5** (credentials + bcrypt), rotas protegidas por `src/middleware.ts`.

## Arquitetura

```
src/
  app/
    (app)/           # telas autenticadas (layout com sidebar + guard de sessão)
    login/           # tela de login (pública)
    api/             # route handlers = backend (Prisma)
  components/ui/     # shadcn (copiado do projeto original)
  lib/
    api-client/      # client HTTP gerado (orval) — chama /api/*
    prisma.ts        # singleton PrismaClient
    dto.ts           # serializadores (mesmo JSON do backend antigo)
  auth.ts / auth.config.ts / middleware.ts
prisma/schema.prisma
```

O client de dados chama os mesmos paths `/api/*` do backend Express original; os Route Handlers replicam o comportamento com Prisma, então as telas não mudaram de camada de dados.

## Setup

```bash
cp .env.example .env      # preencha DATABASE_URL e AUTH_SECRET (gere: openssl rand -base64 32)
npm install
npx prisma generate

# banco novo: cria as tabelas a partir do schema
npx prisma db push
# (ou, se o banco Drizzle já existe com dados, apenas garanta a tabela `users`:
#  npx prisma db push  — o schema está mapeado às tabelas existentes)

npm run db:seed           # cria admin@escola.com / admin123
npm run dev
```

Acesse http://localhost:3000 → redireciona para `/login`. Entre com `admin@escola.com` / `admin123`.

## Docker

Sobe Postgres + app juntos (o app aplica o schema e cria o admin no boot):

```bash
export AUTH_SECRET="$(openssl rand -base64 32)"   # opcional; há default
docker compose up --build
```

App em http://localhost:3000, Postgres em `localhost:5432` (escola/escola). Dados persistem no volume `pgdata`. Para zerar o banco: `docker compose down -v`.

## Módulos implementados

Acadêmico (alunos, professores, cursos, turmas, disciplinas, matrículas, salas, calendário, plano de ensino, matriz), diário eletrônico + frequência, notas + avaliações com peso, certificados/PDFs (boletim, declaração, histórico). Financeiro (contratos/parcelas, bolsas, convênios, inadimplência, renegociação; PIX/NF-e stub). EAD (módulos/aulas, quiz autocorrigido, fórum, entregas, progresso). Processo seletivo (inscrição pública → resultado → matrícula automática). Biblioteca (acervo, empréstimos, reservas, multas, QR). Portal do Aluno. Notificações (SSE). Comunicados (notificação/WhatsApp/e-mail).

**Segurança/infra:** RBAC por papel, login por CPF/e-mail/matrícula, MFA (TOTP), reset de senha (SMTP), Google OAuth (opcional), auditoria, rate-limit (login/inscrição), i18n (pt-BR/en), uploads locais.

**Integrações (env-gated):** Evolution API (WhatsApp), SMTP (e-mail), Google OAuth. Stubs c/ TODO: PIX, NF-e, assinatura eletrônica, conciliação bancária.

## Notas de migração

- Backend Express (`api-server`) e ORM Drizzle foram substituídos por Route Handlers + Prisma. Comportamento (filtros, paginação, joins, cálculo de média/situação de notas, geração de código de certificado, side-effects de matrícula/pagamento) replicado.
- Roteamento `wouter` → App Router file-based + `next/link` / `next/navigation`.
- Auth é novo (não existia no original): login por email/senha, sessão JWT, middleware protege tudo exceto `/login`.
