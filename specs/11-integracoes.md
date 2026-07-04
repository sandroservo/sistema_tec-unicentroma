# 11 — Integrações

## Escopo
Todas as integrações externas são **env-gated com fallback**: sem env, o sistema funciona (log/stub/feature oculta), nada quebra. Nenhuma chave chega ao client. Painel de status em `/(app)/integracoes`.

## Integrações

### SMTP / e-mail — `src/lib/email.ts`
`enviarEmail({to, subject, html, text?})` via **nodemailer**; transporter singleton, gate por `SMTP_HOST`. **Sem env → `console.log("[email:dev] ...")` e retorna `{ok:false}`; nunca lança.** `from` = `SMTP_FROM` (default `no-reply@escola.local`). Usado em: **reset de senha** (`/api/auth/reset`) e **comunicados canal email**. Helper `emailConfigurado()`.

### Evolution API (WhatsApp) — `src/lib/integrations/evolution.ts`
`enviarWhatsapp(numero, texto)` → `POST {URL}/message/sendText/{INSTANCE}` com header `apikey`. Gate: as 3 envs (`evolutionConfigurado()`); sem elas retorna `{ok:false, erro:"Evolution não configurado"}`. **Sanitiza número: só dígitos + prefixa DDI `55` se faltar.** Usado nos comunicados canal whatsapp.

### PIX (stub) — `src/lib/integrations/banco.ts`
`gerarCobrancaPix({valor, descricao, vencimento?})`. Sem env → **stub determinístico** (`txid` `STUB-<centavos>-<slug>`, `copiaECola` fake, `status:"stub"`). Com env → só `{configurado:true, status:"pendente"}` (TODO provedor real: Efí, Mercado Pago...). Exposto em `POST /api/integracoes/pix` (permissão `cobranca:editar`, recebe `parcelaId`, monta descrição com número da parcela + aluno). TODO: persistir txid na parcela.

### Assinatura eletrônica (stub) — `src/lib/integrations/assinatura.ts`
`solicitarAssinatura({documentoNome, signatarioEmail})`. Sem env → stub com `urlAssinatura` fake. Com env → `{configurado:true, status:"pendente"}` (TODO: ZapSign/Clicksign/D4Sign). Exposto em `POST /api/integracoes/assinatura` (permissão `cobranca:editar`, recebe `contratoId` + email do signatário).

### Google OAuth — `src/auth.ts`
Provider Google adicionado só se `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` existem. **Só permite login de e-mail já cadastrado e ativo — sem auto-provisionamento**; token enriquecido com id/papel via lookup no BD. Botão "Entrar com Google" no login aparece dinamicamente (`/api/auth/providers`).

### ViaCEP — `/api/cep/[cep]`
Qualquer logado. Normaliza p/ 8 dígitos (400 senão), consulta `viacep.com.br` (502 em falha, 404 se `erro`), retorna `{cep, logradouro, bairro, cidade, estado}`. Client helper: `src/lib/cep.ts`.

## API
| Rota | Permissão | Comportamento |
|---|---|---|
| GET `/api/integracoes/status` | qualquer logado | `{evolution, pix, assinatura}` — **só booleans, nunca as chaves**. |
| POST `/api/integracoes/pix` | `cobranca:editar` | Gera cobrança PIX (stub) para uma parcela. |
| POST `/api/integracoes/assinatura` | `cobranca:editar` | Solicita assinatura (stub) de um contrato. |
| GET `/api/cep/[cep]` | logado | Proxy ViaCEP. |

## Telas
- `/(app)/integracoes` (nav grupo Configurações, permissão `usuario:gerenciar`) — 3 cards (Evolution, PIX, Assinatura) com badge Configurado/Não configurado e as envs necessárias listadas. Configuração é sempre via env no servidor, não pela UI.

## Envs (`.env.example` — completo)
| Env | Significado |
|---|---|
| `DATABASE_URL` | Postgres (obrigatória). |
| `AUTH_SECRET` | Segredo JWT do Auth.js (obrigatória). |
| `UPLOAD_DIR` | Diretório de uploads de documentos (default `./uploads`). |
| `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` / `EVOLUTION_INSTANCE` | Evolution API (WhatsApp self-hosted): URL base, apikey e nome da instância — as 3 juntas habilitam. |
| `PIX_PROVIDER_URL` / `PIX_PROVIDER_KEY` | Provedor de cobrança PIX (ainda sem implementação real). |
| `ASSINATURA_PROVIDER_URL` / `ASSINATURA_PROVIDER_KEY` | Provedor de assinatura eletrônica (idem, stub). |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Login com Google (habilita o botão; só e-mails já cadastrados). |
| `APP_URL` | URL pública usada em links de e-mail (default: origin da requisição). |
| `SMTP_HOST` / `SMTP_PORT` (587) / `SMTP_SECURE` ("true" p/ TLS implícito) / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | SMTP p/ reset de senha e comunicados; sem `SMTP_HOST` cai em modo log. |

Todas as integrações são opcionais; só `DATABASE_URL` e `AUTH_SECRET` são necessárias para rodar.

## Débitos
- PIX e assinatura são stubs: com env configurada retornam apenas `status:"pendente"` sem chamar provedor; txid não é persistido na parcela.
- Sem webhook de retorno (pagamento PIX confirmado, documento assinado).
- Evolution sem retry/fila (envio síncrono nos comunicados).
- Painel `/integracoes` não mostra status do SMTP nem do Google (só as 3 dos cards).

## Como testar
1. Sem envs: `/integracoes` mostra 3 "Não configurado"; reset de senha loga `[email:dev]` no console do servidor.
2. `POST /api/integracoes/pix {parcelaId}` → resposta stub com `txid` `STUB-...` e `status:"stub"`.
3. Setar `AUTH_GOOGLE_ID/SECRET` → botão Google no login; tentar e-mail não cadastrado → login negado.
4. `GET /api/cep/85015430` logado → endereço; CEP com 7 dígitos → 400.
5. Setar as 3 envs Evolution → `/api/integracoes/status` retorna `evolution:true`; comunicado whatsapp envia para número sanitizado com DDI 55.
